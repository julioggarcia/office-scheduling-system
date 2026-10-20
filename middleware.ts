import { withAuth } from 'next-auth/middleware';

// Every page requires sign-in; API routes check the session themselves (and return 401 JSON instead of redirecting).
export default withAuth({
  pages: { signIn: '/auth/signin' },
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|auth/).*)'],
};
