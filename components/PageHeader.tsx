import React from 'react';
import { useRouter } from 'next/router';

// Logical parent route, used when there is no in-app history to go back to
// (e.g. the page was opened directly from a bookmark or a new tab).
function parentPath(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length <= 1) return '/';
  return '/' + parts.slice(0, -1).join('/');
}

export default function PageHeader({ title, subtitle, backHref, actions }: { title: string; subtitle?: React.ReactNode; backHref?: string; actions?: React.ReactNode }) {
  const router = useRouter();
  const isHome = router.pathname === '/';

  function goBack() {
    // Next.js stores a per-session history index in history.state; idx > 0 means we navigated here within the app
    const idx = typeof window !== 'undefined' ? (window.history.state as any)?.idx : undefined;
    if (typeof idx === 'number' && idx > 0) router.back();
    else router.push(backHref ?? parentPath(router.pathname));
  }

  return (
    <div className="page-header">
      {!isHome && (
        <button type="button" className="back-button" onClick={goBack} aria-label="Go back">
          <span aria-hidden>←</span> Back
        </button>
      )}
      <div className="card-header">
        <div>
          <h1>{title}</h1>
          {subtitle && <p className="subtitle">{subtitle}</p>}
        </div>
        {actions}
      </div>
    </div>
  );
}
