import type { NextApiRequest, NextApiResponse } from 'next';
import type { NextAuthOptions } from 'next-auth';
import { getServerSession } from 'next-auth/next';
import AzureADProvider from 'next-auth/providers/azure-ad';
import CredentialsProvider from 'next-auth/providers/credentials';
import type { User } from '@prisma/client';
import prisma from './prisma';

export type Role = 'STAFF' | 'MANAGER' | 'ADMIN';
export const ROLES: Role[] = ['STAFF', 'MANAGER', 'ADMIN'];

export const azureConfigured = !!(process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET && process.env.AZURE_AD_TENANT_ID);
// Pick-any-user login for local development only; never enabled in production builds.
export const devLoginEnabled = process.env.AUTH_DEV_LOGIN === 'true' && process.env.NODE_ENV !== 'production';

// Comma-separated list of emails that are promoted to ADMIN on sign-in (bootstrap the first admin).
const adminEmails = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/** Find the staff record for a signed-in identity, linking AD object ids and creating the user if new. */
async function upsertSignedInUser({ email, name, adObjectId }: { email: string; name?: string | null; adObjectId?: string | null }) {
  email = normalizeEmail(email);
  let user = adObjectId ? await prisma.user.findUnique({ where: { adObjectId } }) : null;
  if (!user) user = await prisma.user.findUnique({ where: { email } });

  const promote = adminEmails.includes(email) ? { role: 'ADMIN' } : {};
  if (user) {
    return prisma.user.update({
      where: { id: user.id },
      data: { ...promote, name: user.name || name || undefined, adObjectId: user.adObjectId || adObjectId || undefined },
    });
  }
  return prisma.user.create({ data: { email, name: name || email, adObjectId: adObjectId || null, ...promote } });
}

const providers: NextAuthOptions['providers'] = [];
if (azureConfigured) {
  providers.push(
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      // tenant is something like 'yourtenant.onmicrosoft.com' or the tenant id
      tenantId: process.env.AZURE_AD_TENANT_ID!,
    })
  );
}
if (devLoginEnabled) {
  providers.push(
    CredentialsProvider({
      id: 'dev',
      name: 'Development login',
      credentials: { email: { label: 'Email', type: 'email' } },
      async authorize(credentials) {
        const email = credentials?.email?.trim();
        if (!email || !email.includes('@')) return null;
        const user = await upsertSignedInUser({ email });
        return { id: user.id, email: user.email, name: user.name };
      },
    })
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  secret: process.env.NEXTAUTH_SECRET,
  // JWT sessions: no Account/Session tables needed, and required by the credentials provider
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: '/auth/signin' },
  callbacks: {
    async signIn({ account, profile, user }) {
      if (account?.provider === 'azure-ad') {
        const p = profile as any;
        const email = p?.email || p?.preferred_username || user.email;
        if (!email) return false;
        const dbUser = await upsertSignedInUser({ email, name: p?.name, adObjectId: p?.oid });
        if (!dbUser.active) return false;
        (user as any).dbId = dbUser.id;
        return true;
      }
      if (account?.provider === 'dev') return true;
      return false;
    },
    async jwt({ token, user }) {
      if (user) token.uid = (user as any).dbId || user.id;
      return token;
    },
    async session({ session, token }) {
      // read role fresh so role/manager changes apply without signing out
      const dbUser = token.uid ? await prisma.user.findUnique({ where: { id: token.uid as string } }) : null;
      if (dbUser) session.user = { id: dbUser.id, email: dbUser.email, name: dbUser.name, role: dbUser.role as Role };
      return session;
    },
  },
};

/** The signed-in, active user for an API request, or null. */
export async function getCurrentUser(req: NextApiRequest, res: NextApiResponse): Promise<User | null> {
  const session = await getServerSession(req, res, authOptions);
  const id = (session?.user as any)?.id as string | undefined;
  if (!id) return null;
  const user = await prisma.user.findUnique({ where: { id } });
  return user && user.active ? user : null;
}

export function hasRole(user: Pick<User, 'role'> | null | undefined, ...roles: Role[]) {
  return !!user && roles.includes(user.role as Role);
}

/** Responds 401/403 and returns null when the caller isn't signed in (or lacks one of `roles`). */
export async function requireUser(req: NextApiRequest, res: NextApiResponse, ...roles: Role[]) {
  const user = await getCurrentUser(req, res);
  if (!user) {
    res.status(401).json({ error: 'Sign in required' });
    return null;
  }
  if (roles.length && !hasRole(user, ...roles)) {
    res.status(403).json({ error: 'Not allowed' });
    return null;
  }
  return user;
}

/** Admins can act for anyone, managers for their direct reports, everyone for themselves. */
export async function canActFor(actor: User, targetUserId: string) {
  if (actor.id === targetUserId || actor.role === 'ADMIN') return true;
  if (actor.role !== 'MANAGER') return false;
  const target = await prisma.user.findUnique({ where: { id: targetUserId }, select: { managerId: true } });
  return target?.managerId === actor.id;
}
