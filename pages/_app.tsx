import '../styles/globals.css';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { SessionProvider } from 'next-auth/react';
import React, { useEffect, useState } from 'react';

const NAV = [
  { href: '/', label: 'Reserve' },
  { href: '/admin', label: 'Admin' },
  { href: '/map-editor', label: 'Map Editor' },
  { href: '/admin/upload-svg', label: 'Upload Floorplan' },
];

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  const router = useRouter();
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

  // most specific nav item matching the current route is active
  const active = NAV.filter((n) => n.href === '/' ? router.pathname === '/' : router.pathname.startsWith(n.href))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <SessionProvider session={session}>
      <Head>
        <title>Office Reservation</title>
      </Head>
      <header className="header">
        <Link href="/" className="brand">
          <span className="brand-mark" aria-hidden>▦</span>
          Office Reservation
        </Link>
        <nav className="nav">
          {NAV.map((n) => (
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
        </nav>
      </header>
      <main className="container">
        <Component {...pageProps} />
      </main>
    </SessionProvider>
  );
}
