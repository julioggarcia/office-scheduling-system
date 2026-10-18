import NextAuth from 'next-auth';
import AzureADProvider from 'next-auth/providers/azure-ad';
import prisma from '../../../lib/prisma';
import { PrismaAdapter } from '@next-auth/prisma-adapter';

export default NextAuth({
  adapter: PrismaAdapter(prisma as any),
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID || '',
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET || '',
      // tenant is something like 'yourtenant.onmicrosoft.com' or the tenant id
      tenantId: process.env.AZURE_AD_TENANT_ID || '',
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async session({ session, user }) {
      // include user id and isAdmin flag in session
      session.user = { ...(session.user as any), id: user.id, isAdmin: (user as any).isAdmin } as any;
      return session;
    },
  },
});
