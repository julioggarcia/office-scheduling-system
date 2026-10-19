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
      let url = `/api/reservations?locationId=${encodeURIComponent(locationId)}&page=${page}&pageSize=${pageSize}`;
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
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{filter === 'upcoming' ? 'Upcoming' : filter === 'past' ? 'Past' : 'In-progress'} reservations for this location</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={{ fontSize: 12, color: 'var(--muted)' }}>Show:</label>
            <select value={filter} onChange={(e) => setFilter(e.target.value as any)}>
              <option value="upcoming">Upcoming</option>
              <option value="in-progress">In-progress</option>
              <option value="past">Past</option>
            </select>
          </div>
        </div>
        {loading ? <div>Loading...</div> : (
            <div>
              {reservations.length === 0 ? <div style={{ color: 'var(--muted)' }}>No {filter === 'upcoming' ? 'upcoming' : filter === 'past' ? 'past' : 'in-progress'} reservations</div> : (
              <ul>
                {reservations.map(r => (
                  <li key={r.id} style={{ marginBottom: 6 }}>
                    <div><strong>{r.user?.name || r.userId}</strong> — {formatLocal(r.start)} to {formatLocal(r.end)} {r.approved ? '' : '(unapproved)'}</div>
                    <div style={{ marginTop: 4, display: 'flex', gap: 8 }}>
                      <button onClick={() => doDelete(r.id)} style={{ color: 'red' }}>Delete</button>
                      <button onClick={() => toggleApproved(r.id, !!r.approved)}>{r.approved ? 'Unapprove' : 'Approve'}</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {meta && (
              <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                <button onClick={() => setPage(Math.max(1, (meta.page || page) - 1))} disabled={(meta.page || page) <= 1}>Prev</button>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Page {(meta.page || page)} of {meta.totalPages || 1} — {meta.total || 0} total</div>
                <button onClick={() => setPage((meta.page || page) + 1)} disabled={(meta.page || page) >= (meta.totalPages || 1)}>Next</button>
              </div>
            )}
          </div>
        )}
      </div>

      <hr />
      <div style={{ marginTop: 8 }}>
        <h5>Create reservation</h5>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input placeholder="user id (db id or email)" value={userId} onChange={(e) => setUserId(e.target.value)} />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <select value={startHour} onChange={(e) => setStartHour(Number(e.target.value))}>
            {Array.from({length: 22}, (_,i) => i).map(h => <option key={h} value={h}>{h}:00</option>)}
          </select>
          <select value={endHour} onChange={(e) => setEndHour(Number(e.target.value))}>
            {Array.from({length: 23}, (_,i) => i+1).map(h => <option key={h} value={h}>{h}:00</option>)}
          </select>
        </div>
        <div style={{ marginTop: 8 }}>
          <label><input type="checkbox" checked={includeChildren} onChange={(e) => setIncludeChildren(e.target.checked)} /> Include sublocations</label>
        </div>
        <div style={{ marginTop: 8 }}>
          <button onClick={doCreate}>Create Reservation</button>
        </div>
      </div>
    </div>
  );
}
