import React, { useEffect, useState } from 'react';
import UserPicker, { PickedUser } from './UserPicker';

type Status = { ok: boolean; title: string; text?: string } | null;

function StatusAlert({ status, onClose }: { status: Status; onClose: () => void }) {
  if (!status) return null;
  return (
    <div className={'alert alert-dismissible' + (status.ok ? ' alert-success' : ' alert-error')} role={status.ok ? 'status' : 'alert'}>
      <span className="alert-icon" aria-hidden>{status.ok ? '✓' : '!'}</span>
      <div>
        <strong>{status.title}</strong>
        {status.text && <div>{status.text}</div>}
      </div>
      <button type="button" className="alert-close" onClick={onClose} aria-label="Dismiss">×</button>
    </div>
  );
}

async function errorText(res: Response) {
  const j = await res.json().catch(() => ({}));
  return j.error || `Request failed (${res.status})`;
}

export default function ReservationsPanel({ locationId, onChanged, polys }: { locationId: string; onChanged?: () => void; polys: Array<{ id: string; label?: string; type?: string; parentId?: string | null; points: any[] }> }) {
  const [loading, setLoading] = useState(false);
  const [reservations, setReservations] = useState<any[]>([]);
  const [meta, setMeta] = useState<{ total?: number; page?: number; pageSize?: number; totalPages?: number } | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [filter, setFilter] = useState<'upcoming' | 'in-progress' | 'past'>('upcoming');
  const [user, setUser] = useState<PickedUser | null>(null);
  const [creating, setCreating] = useState(false);
  const [createStatus, setCreateStatus] = useState<Status>(null);
  const [listStatus, setListStatus] = useState<Status>(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0,10));
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(10);
  const [includeChildren, setIncludeChildren] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [locationId, filter]);

  useEffect(() => {
    setCreateStatus(null);
    setListStatus(null);
  }, [locationId]);

  useEffect(() => {
    loadReservations();
  }, [locationId, page, filter]);

  async function loadReservations() {
    if (!locationId) {
      setReservations([]);
      setMeta(null);
      return;
    }
    setLoading(true);
    try {
      // includeChildren so a parent (e.g. an office) also lists reservations on its desks/cubicles
      let url = `/api/reservations?locationId=${encodeURIComponent(locationId)}&includeChildren=true&page=${page}&pageSize=${pageSize}`;
      if (filter === 'past') {
        url += '&includePast=true';
      } else if (filter === 'in-progress') {
        const nowIso = new Date().toISOString();
        url += `&startIso=${encodeURIComponent(nowIso)}&endIso=${encodeURIComponent(nowIso)}`;
      } // upcoming is default behavior (no extra params)

      const res = await fetch(url);
      if (res.ok) {
        const j = await res.json();
        // API may return either an array (legacy) or an object { meta, reservations }
        if (Array.isArray(j)) {
          setReservations(j);
          setMeta(null);
        } else if (j && Array.isArray(j.reservations)) {
          setReservations(j.reservations);
          setMeta(j.meta || null);
        } else {
          // unexpected shape
          setReservations([]);
          setMeta(null);
        }
      } else {
        setReservations([]);
        setMeta(null);
      }
    } catch (err) {
      console.error(err);
      setReservations([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }

  function formatLocal(iso: string) {
    try {
      const d = new Date(iso);
      return d.toLocaleString();
    } catch (err) {
      return iso;
    }
  }

  async function doCreate() {
    if (!user) {
      setCreateStatus({ ok: false, title: 'Choose who the reservation is for', text: 'Search for a user by name or email.' });
      return;
    }
    const startLocal = new Date(`${date}T${String(startHour).padStart(2,'0')}:00:00`);
    const endLocal = new Date(`${date}T${String(endHour).padStart(2,'0')}:00:00`);
    if (endLocal <= startLocal) {
      setCreateStatus({ ok: false, title: 'Check the times', text: '"To" must be later than "From".' });
      return;
    }
    const who = user.name || user.email;
    setCreating(true);
    setCreateStatus(null);
    try {
      const res = await fetch('/api/reservations/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ locationId, userId: user.id, start: startLocal.toISOString(), end: endLocal.toISOString(), includeChildren }) });
      if (!res.ok) {
        setCreateStatus({ ok: false, title: `Couldn't reserve for ${who}`, text: await errorText(res) });
      } else {
        setCreateStatus({ ok: true, title: `Reserved for ${who}`, text: `${startLocal.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}, ${startHour}:00 – ${endHour}:00` });
        setUser(null);
        onChanged?.();
        loadReservations();
      }
    } catch (err) {
      console.error(err);
      setCreateStatus({ ok: false, title: `Couldn't reserve for ${who}`, text: 'Network error — check your connection and try again.' });
    } finally {
      setCreating(false);
    }
  }

  async function doDelete(id: string) {
    if (!confirm('Delete reservation?')) return;
    setListStatus(null);
    try {
      const res = await fetch(`/api/reservations/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        setListStatus({ ok: false, title: "Couldn't delete the reservation", text: await errorText(res) });
      } else {
        setListStatus({ ok: true, title: 'Reservation deleted' });
        loadReservations();
        onChanged?.();
      }
    } catch (err) {
      console.error(err);
      setListStatus({ ok: false, title: "Couldn't delete the reservation", text: 'Network error — check your connection and try again.' });
    }
  }

  async function toggleApproved(id: string, cur: boolean) {
    setListStatus(null);
    try {
      const res = await fetch(`/api/reservations/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ approved: !cur }) });
      if (!res.ok) {
        setListStatus({ ok: false, title: `Couldn't ${cur ? 'unapprove' : 'approve'} the reservation`, text: await errorText(res) });
      } else {
        loadReservations();
        onChanged?.();
      }
    } catch (err) {
      console.error(err);
      setListStatus({ ok: false, title: `Couldn't ${cur ? 'unapprove' : 'approve'} the reservation`, text: 'Network error — check your connection and try again.' });
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div className="toolbar" style={{ justifyContent: 'space-between' }}>
          <div className="hint">{filter === 'upcoming' ? 'Upcoming' : filter === 'past' ? 'Past' : 'In-progress'} reservations for this location</div>
          <div className="segmented">
            {(['upcoming', 'in-progress', 'past'] as const).map((f) => (
              <button key={f} className={'btn-sm' + (filter === f ? ' btn-active' : '')} onClick={() => setFilter(f)} style={{ textTransform: 'capitalize' }}>{f.replace('-', ' ')}</button>
            ))}
          </div>
        </div>
        <StatusAlert status={listStatus} onClose={() => setListStatus(null)} />
        {loading ? <div className="hint">Loading…</div> : (
            <div>
              {reservations.length === 0 ? <div className="hint">No {filter === 'upcoming' ? 'upcoming' : filter === 'past' ? 'past' : 'in-progress'} reservations</div> : (
              <ul className="res-list">
                {reservations.map(r => (
                  <li key={r.id} className="res-item">
                    <div className="card-header">
                      <div>
                        <strong>{r.user?.name || r.userId}</strong>{' '}
                        {!r.approved && <span className="badge badge-warning">Pending</span>}
                        {r.locationId !== locationId && (
                          <span className="badge" style={{ marginLeft: 4 }}>{r.location?.label || polys.find(p => p.id === r.locationId)?.label || 'Sublocation'}</span>
                        )}
                        <div className="when">{formatLocal(r.start)} → {formatLocal(r.end)}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-sm" onClick={() => toggleApproved(r.id, !!r.approved)}>{r.approved ? 'Unapprove' : 'Approve'}</button>
                        <button className="btn-sm btn-danger" onClick={() => doDelete(r.id)}>Delete</button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {meta && (
              <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                <button className="btn-sm" onClick={() => setPage(Math.max(1, (meta.page || page) - 1))} disabled={(meta.page || page) <= 1}>‹ Prev</button>
                <div className="hint">Page {(meta.page || page)} of {meta.totalPages || 1} · {meta.total || 0} total</div>
                <button className="btn-sm" onClick={() => setPage((meta.page || page) + 1)} disabled={(meta.page || page) >= (meta.totalPages || 1)}>Next ›</button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="panel" style={{ background: 'var(--surface)' }}>
        <h3>Create reservation</h3>
        <div className="row">
          <div className="field" style={{ minWidth: 260 }}>
            <label>User</label>
            <UserPicker value={user} onChange={(u) => { setUser(u); setCreateStatus(null); }} />
          </div>
          <div className="field">
            <label>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label>From</label>
            <select value={startHour} onChange={(e) => setStartHour(Number(e.target.value))}>
              {Array.from({length: 22}, (_,i) => i).map(h => <option key={h} value={h}>{h}:00</option>)}
            </select>
          </div>
          <div className="field">
            <label>To</label>
            <select value={endHour} onChange={(e) => setEndHour(Number(e.target.value))}>
              {Array.from({length: 23}, (_,i) => i+1).map(h => <option key={h} value={h}>{h}:00</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <label className="hint"><input type="checkbox" checked={includeChildren} onChange={(e) => setIncludeChildren(e.target.checked)} /> Include sublocations</label>
        </div>
        <div className="actions">
          <button className="btn-primary" onClick={doCreate} disabled={creating}>{creating ? 'Reserving…' : 'Create reservation'}</button>
        </div>
        <StatusAlert status={createStatus} onClose={() => setCreateStatus(null)} />
      </div>
    </div>
  );
}
