import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { SessionProvider } from 'next-auth/react';
import React, { useEffect, useState } from 'react';

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  // avoid reading localStorage during render to prevent hydration mismatch
  useEffect(() => {
    try {
      const stored = localStorage.getItem('theme') as 'light' | 'dark' | null;
      if (stored && stored !== theme) setTheme(stored);
    } catch (e) {}
    // apply class when theme changes
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
      <div>
        <header className="header">
          <div className="title">Office Reservation</div>
          <div className="nav">
            <a href="/admin">Admin</a>
            <a href="/map-editor">Map Editor</a>
            <a href="/admin/upload-svg">Upload</a>
            <button onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))} style={{ marginLeft: 8 }}>
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </button>
          </div>
        </header>
        <main className="container">
          <Component {...pageProps} />
        </main>
      </div>
    </SessionProvider>
  );
}
