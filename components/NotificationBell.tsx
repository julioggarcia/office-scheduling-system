import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

type Item = { id: string; title: string; body: string | null; link: string | null; readAt: string | null; createdAt: string };

const POLL_MS = 45000;

export default function NotificationBell() {
  const [items, setItems] = useState<Item[]>([]);
  const [unread, setUnread] = useState(0);
  const [email, setEmail] = useState(true);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const r = await fetch('/api/notifications');
      if (!r.ok) return;
      const j = await r.json();
      setItems(j.items); setUnread(j.unread); setEmail(j.emailNotifications);
    } catch (err) {
      // offline: keep what we have
    }
  }

  async function put(body: object) {
    await fetch('/api/notifications', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    load();
  }

  useEffect(() => {
    load();
    const t = setInterval(() => { if (!document.hidden) load(); }, POLL_MS);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  return (
    <div className="notif" ref={ref}>
      <button className="btn-sm notif-btn" onClick={() => { setOpen((o) => !o); load(); }} aria-expanded={open} aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}>
        <span aria-hidden>🔔</span>
        {unread > 0 && <span className="notif-count">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="notif-menu" role="dialog" aria-label="Notifications">
          <div className="notif-head">
            <strong>Notifications</strong>
            <button className="btn-sm" onClick={() => put({ markRead: true })} disabled={!unread}>Mark all read</button>
          </div>
          {items.length === 0 ? <div className="empty">Nothing yet.</div> : (
            <ul className="notif-list">
              {items.map((n) => {
                const body = (
                  <>
                    <div className="notif-title">{!n.readAt && <span className="notif-dot" aria-label="Unread" />}{n.title}</div>
                    {n.body && <div className="hint">{n.body}</div>}
                    <div className="hint">{new Date(n.createdAt).toLocaleString()}</div>
                  </>
                );
                const onClick = () => { if (!n.readAt) put({ ids: [n.id] }); setOpen(false); };
                return <li key={n.id}>{n.link ? <Link href={n.link} onClick={onClick}>{body}</Link> : <div onClick={onClick}>{body}</div>}</li>;
              })}
            </ul>
          )}
          <label className="notif-foot">
            <input type="checkbox" checked={email} onChange={(e) => put({ emailNotifications: e.target.checked })} /> Also email me
          </label>
        </div>
      )}
    </div>
  );
}
