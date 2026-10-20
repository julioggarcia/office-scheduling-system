import React, { useEffect, useState } from 'react';

export default function ReservationsPanel({ locationId, onChanged, polys }: { locationId: string; onChanged?: () => void; polys: Array<{ id: string; label?: string; type?: string; parentId?: string | null; points: any[] }> }) {
  const [loading, setLoading] = useState(false);
  const [reservations, setReservations] = useState<any[]>([]);
  const [meta, setMeta] = useState<{ total?: number; page?: number; pageSize?: number; totalPages?: number } | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [filter, setFilter] = useState<'upcoming' | 'in-progress' | 'past'>('upcoming');
  const [userId, setUserId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0,10));
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(10);
  const [includeChildren, setIncludeChildren] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [locationId, filter]);

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
    if (!userId) return alert('Enter user id');
    const startLocal = new Date(`${date}T${String(startHour).padStart(2,'0')}:00:00`);
    const endLocal = new Date(`${date}T${String(endHour).padStart(2,'0')}:00:00`);
    const startIso = startLocal.toISOString();
    const endIso = endLocal.toISOString();
    try {
      const res = await fetch('/api/reservations/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ locationId, userId, start: startIso, end: endIso, includeChildren }) });
      if (!res.ok) {
        const j = await res.json();
        alert('Failed: ' + JSON.stringify(j));
      } else {
        alert('Created');
        setUserId('');
        onChanged?.();
        loadReservations();
      }
    } catch (err) {
      console.error(err);
      alert('Error creating');
    }
  }

  async function doDelete(id: string) {
    if (!confirm('Delete reservation?')) return;
    try {
      const res = await fetch(`/api/reservations/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json();
        alert('Failed deleting: ' + JSON.stringify(j));
      } else {
        alert('Deleted');
        loadReservations();
        onChanged?.();
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting');
    }
  }

  async function toggleApproved(id: string, cur: boolean) {
    try {
      const res = await fetch(`/api/reservations/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ approved: !cur }) });
      if (!res.ok) {
        const j = await res.json();
        alert('Failed updating: ' + JSON.stringify(j));
      } else {
        loadReservations();
        onChanged?.();
      }
    } catch (err) {
      console.error(err);
      alert('Error updating');
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
          <div className="field">
            <label>User</label>
            <input placeholder="User id or email" value={userId} onChange={(e) => setUserId(e.target.value)} />
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
          <button className="btn-primary" onClick={doCreate}>Create reservation</button>
        </div>
      </div>
    </div>
  );
}
