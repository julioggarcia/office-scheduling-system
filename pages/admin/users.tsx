import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import PageHeader from '../../components/PageHeader';

type Person = { id: string; name: string | null; email: string; role: string; active: boolean; managerId: string | null };

export default function UsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<Person[]>([]);
  const [q, setQ] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function load() {
    const res = await fetch('/api/users');
    if (res.ok) setUsers(await res.json());
  }
  useEffect(() => { load(); }, []);

  async function update(id: string, data: Partial<Person>) {
    setMessage(null);
    const res = await fetch('/api/users/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) setMessage({ ok: false, text: j.error || 'Update failed' });
    else { setMessage({ ok: true, text: 'Saved' }); load(); }
  }

  const needle = q.trim().toLowerCase();
  const shown = needle ? users.filter((u) => (u.name || '').toLowerCase().includes(needle) || u.email.toLowerCase().includes(needle)) : users;
  const managers = users.filter((u) => u.role !== 'STAFF');

  return (
    <div>
      <PageHeader
        title="Staff & roles"
        subtitle="Managers can assign seats to and approve requests from their direct reports. Admins can do everything."
        actions={<input placeholder="Search name or email" value={q} onChange={(e) => setQ(e.target.value)} />}
      />
      {message && <div className={'alert' + (message.ok ? '' : ' alert-error')} style={{ marginBottom: 16 }}>{message.text}</div>}
      {session?.user?.role !== 'ADMIN' ? (
        <div className="card empty">Only admins can manage staff.</div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Name</th><th>Role</th><th>Manager</th><th>Active</th></tr>
              </thead>
              <tbody>
                {shown.map((u) => (
                  <tr key={u.id}>
                    <td><strong>{u.name || u.email}</strong><div className="hint">{u.email}</div></td>
                    <td>
                      <select value={u.role} onChange={(e) => update(u.id, { role: e.target.value })} disabled={u.id === session.user.id}>
                        <option value="STAFF">Staff</option>
                        <option value="MANAGER">Manager</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </td>
                    <td>
                      <select value={u.managerId ?? ''} onChange={(e) => update(u.id, { managerId: e.target.value || null })}>
                        <option value="">None</option>
                        {managers.filter((m) => m.id !== u.id).map((m) => <option key={m.id} value={m.id}>{m.name || m.email}</option>)}
                      </select>
                    </td>
                    <td><input type="checkbox" checked={u.active} onChange={(e) => update(u.id, { active: e.target.checked })} disabled={u.id === session.user.id} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
