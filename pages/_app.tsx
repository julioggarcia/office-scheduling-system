import '../styles/globals.css';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { SessionProvider, signOut, useSession } from 'next-auth/react';
import React, { useEffect, useState } from 'react';

type Role = 'STAFF' | 'MANAGER' | 'ADMIN';

const NAV: Array<{ href: string; label: string; roles?: Role[] }> = [
  { href: '/', label: 'Reserve' },
  { href: '/assignments', label: 'My Seat' },
  { href: '/admin', label: 'Admin', roles: ['ADMIN'] },
  { href: '/map-editor', label: 'Map Editor', roles: ['ADMIN'] },
];

function Header({ theme, setTheme }: { theme: 'light' | 'dark'; setTheme: React.Dispatch<React.SetStateAction<'light' | 'dark'>> }) {
  const router = useRouter();
  const { data: session } = useSession();
  const role = session?.user?.role;
  const items = NAV.filter((n) => !n.roles || (role && n.roles.includes(role)));

  // most specific nav item matching the current route is active
  const active = items.filter((n) => n.href === '/' ? router.pathname === '/' : router.pathname.startsWith(n.href))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <header className="header">
      <Link href="/" className="brand">
        <span className="brand-mark" aria-hidden>▦</span>
        <span className="brand-name">Office Reservation</span>
      </Link>
      <nav className="nav">
        {session && items.map((n) => (
          <Link key={n.href} href={n.href} className={'nav-link' + (active === n.href ? ' active' : '')}>{n.label}</Link>
        ))}
        <button
          onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          className="btn-sm"
          style={{ marginLeft: 8 }}
          aria-label="Toggle dark mode"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>
        {session && (
          <div className="user-chip" title={session.user.email}>
            <span className="avatar" aria-hidden>{(session.user.name || session.user.email).slice(0, 1).toUpperCase()}</span>
            <span className="user-name">{session.user.name || session.user.email}</span>
            {role !== 'STAFF' && <span className="badge">{role?.toLowerCase()}</span>}
            <button className="btn-sm" onClick={() => signOut({ callbackUrl: '/auth/signin' })}>Sign out</button>
          </div>
        )}
      </nav>
    </header>
  );
}

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  // avoid reading localStorage during render to prevent hydration mismatch
  useEffect(() => {
    try {
      const stored = localStorage.getItem('theme') as 'light' | 'dark' | null;
      const preferred = stored ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      if (preferred !== theme) setTheme(preferred);
    } catch (e) {}
  }, []);

  useEffect(() => {
    try {
      if (theme === 'dark') document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', theme);
    } catch (e) {}
  }, [theme]);

  return (
    <SessionProvider session={session}>
      <Head>
        <title>Office Reservation</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#4f46e5" />
      </Head>
      <Header theme={theme} setTheme={setTheme} />
      <main className="container">
        <Component {...pageProps} />
      </main>
    </SessionProvider>
  );
}
