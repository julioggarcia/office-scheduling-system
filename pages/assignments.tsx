import React, { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import PageHeader from '../components/PageHeader';
import LocationMap from '../components/LocationMap';

type Building = { id: string; name: string; floors: { id: string; name: string }[] };
type Loc = { id: string; label: string; type: string; parentId?: string | null; polygon?: { points: string } | null };
type Person = { id: string; name: string | null; email: string; role: string; managerId: string | null };
type Assignment = {
  id: string; status: string; schedule: string; startDate: string; endDate: string | null; note: string | null; reviewNote: string | null;
  user: { id: string; name: string | null; email: string };
  requestedBy: { id: string; name: string | null; email: string };
  reviewedBy: { name: string | null; email: string } | null;
  location: { id: string; label: string; type: string; floor: { name: string; building: { name: string } } };
};
type Conflict = { code: string; error: string; details: any[] };

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const STATUS_BADGE: Record<string, string> = { PENDING: 'badge-warning', APPROVED: 'badge-success', REJECTED: 'badge-danger', CANCELLED: '' };

function localIsoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
const personName = (p: { name: string | null; email: string }) => p.name || p.email;

async function api(url: string, init?: RequestInit) {
  const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

function ConflictList({ conflict }: { conflict: Conflict }) {
  return (
    <div className="alert alert-error">
      <strong>{conflict.error}</strong>
      <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
        {conflict.details.slice(0, 8).map((d) => (
          <li key={d.id}>
            {d.user} · {d.location} · {d.schedule ?? `${new Date(d.start).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })} – ${new Date(d.end).toLocaleTimeString(undefined, { timeStyle: 'short' })}`}
          </li>
        ))}
        {conflict.details.length > 8 && <li>…and {conflict.details.length - 8} more</li>}
      </ul>
    </div>
  );
}

function RequestForm({ role, meId, onCreated }: { role: string; meId: string; onCreated: () => void }) {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [buildingId, setBuildingId] = useState('');
  const [floorId, setFloorId] = useState('');
  const [floorImage, setFloorImage] = useState<string | undefined>();
  const [locations, setLocations] = useState<Loc[]>([]);
  const [locationId, setLocationId] = useState('');
  const [people, setPeople] = useState<Person[]>([]);
  const [userId, setUserId] = useState(meId);
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [startDate, setStartDate] = useState(() => localIsoDate(new Date()));
  const [endDate, setEndDate] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [conflict, setConflict] = useState<Conflict | null>(null);

  const canPickPerson = role === 'ADMIN' || role === 'MANAGER';
  const selfService = !canPickPerson || userId === meId;

  useEffect(() => {
    fetch('/api/buildings').then((r) => r.json()).then((b: Building[]) => {
      setBuildings(b);
      if (b.length) { setBuildingId(b[0].id); setFloorId(b[0].floors?.[0]?.id || ''); }
    }).catch(console.error);
    if (canPickPerson) fetch('/api/users').then((r) => r.json()).then(setPeople).catch(console.error);
  }, [canPickPerson]);

  useEffect(() => {
    setLocationId('');
    if (!floorId) { setLocations([]); setFloorImage(undefined); return; }
    fetch('/api/floors/' + floorId).then((r) => r.json()).then((f) => setFloorImage(f.imageContent || undefined)).catch(() => setFloorImage(undefined));
    fetch('/api/locations?floorId=' + floorId).then((r) => r.json()).then(setLocations).catch(() => setLocations([]));
  }, [floorId]);

  const floors = buildings.find((b) => b.id === buildingId)?.floors ?? [];

  async function submit(cancelConflicts = false) {
    setMessage(null);
    setConflict(null);
    if (!locationId) return setMessage({ ok: false, text: 'Pick a seat on the map or from the list.' });
    setBusy(true);
    const { ok, body } = await api('/api/assignments', {
      method: 'POST',
      body: JSON.stringify({ userId, locationId, days, startMinute: toMinutes(startTime), endMinute: endTime === '00:00' ? 1440 : toMinutes(endTime), startDate, endDate: endDate || null, note, cancelConflicts }),
    });
    setBusy(false);
    if (ok) {
      setMessage({ ok: true, text: body.status === 'APPROVED' ? 'Seat assigned.' : 'Request sent for approval.' });
      setNote('');
      onCreated();
    } else if (body.code) {
      setConflict(body);
    } else {
      setMessage({ ok: false, text: body.error || 'Request failed' });
    }
  }

  return (
    <div className="card">
      <h2>Request an assigned seat</h2>
      <p className="hint">
        {selfService
          ? 'Your manager or an admin will review the request. Once approved, nobody else can reserve the seat during your hours.'
          : 'Assignments you make for your team take effect immediately.'}
      </p>

      {canPickPerson && (
        <div className="field">
          <label>Staff member</label>
          <select value={userId} onChange={(e) => setUserId(e.target.value)}>
            {people.map((p) => <option key={p.id} value={p.id}>{p.id === meId ? `Me (${personName(p)})` : personName(p)}</option>)}
          </select>
        </div>
      )}

      <div className="row" style={{ marginBottom: 16 }}>
        <div className="field">
          <label>Building</label>
          <select value={buildingId} onChange={(e) => { setBuildingId(e.target.value); setFloorId(buildings.find((b) => b.id === e.target.value)?.floors?.[0]?.id || ''); }}>
            {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Floor</label>
          <select value={floorId} onChange={(e) => setFloorId(e.target.value)}>
            {floors.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Seat</label>
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            <option value="">Select…</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.label} ({l.type})</option>)}
          </select>
        </div>
      </div>

      {floorImage && locations.length > 0 && (
        <div style={{ marginBottom: 16, maxWidth: 640 }}>
          <LocationMap
            imageUrl={floorImage}
            polygons={locations.map((l) => ({ id: l.id, points: l.polygon?.points ?? '', label: l.label }))}
            selectedId={locationId || undefined}
            onPolygonClick={setLocationId}
          />
          <div className="hint" style={{ marginTop: 6 }}>Tap a seat to select it.</div>
        </div>
      )}

      <div className="field">
        <label>Days in the office</label>
        <div className="day-toggle">
          {DAYS.map((d, i) => (
            <button type="button" key={d} className={days.includes(i) ? 'btn-active' : ''} aria-pressed={days.includes(i)}
              onClick={() => setDays((cur) => cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i].sort())}>{d}</button>
          ))}
        </div>
      </div>

      <div className="row" style={{ marginBottom: 16 }}>
        <div className="field">
          <label>From</label>
          <input type="time" step={900} value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </div>
        <div className="field">
          <label>To</label>
          <input type="time" step={900} value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </div>
        <div className="field">
          <label>Starting</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="field">
          <label>Until (optional)</label>
          <input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      <div className="field">
        <label>Note (optional)</label>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. need a dual-monitor desk" style={{ maxWidth: 'none' }} />
      </div>

      <div className="actions">
        <button className="btn-primary" disabled={busy || !days.length} onClick={() => submit(false)}>{busy ? 'Sending…' : selfService ? 'Send request' : 'Assign seat'}</button>
      </div>
      {message && <div className={'alert' + (message.ok ? '' : ' alert-error')}>{message.text}</div>}
      {conflict && (
        <>
          <ConflictList conflict={conflict} />
          {conflict.code === 'RESERVATION_CONFLICTS' && (
            <div className="actions">
              <button className="btn-danger" disabled={busy} onClick={() => submit(true)}>Assign anyway and cancel {conflict.details.length} reservation(s)</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AssignmentRow({ a, meId, canReview, onChanged }: { a: Assignment; meId: string; canReview: boolean; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(action: string, extra: any = {}) {
    setBusy(true);
    setError(null);
    const { ok, body } = await api('/api/assignments/' + a.id, { method: 'PUT', body: JSON.stringify({ action, ...extra }) });
    setBusy(false);
    if (ok) { setConflict(null); onChanged(); }
    else if (body.code) setConflict(body);
    else setError(body.error || 'Failed');
  }

  const showReview = canReview && a.status === 'PENDING' && a.user.id !== meId;
  const canCancel = ['PENDING', 'APPROVED'].includes(a.status);

  return (
    <li className="res-item">
      <div className="card-header" style={{ alignItems: 'flex-start' }}>
        <div>
          <div>
            <strong>{a.location.label}</strong>{' '}
            <span className={'badge ' + (STATUS_BADGE[a.status] ?? '')}>{a.status.toLowerCase()}</span>
          </div>
          <div className="when">{a.location.floor.building.name} · {a.location.floor.name}</div>
          <div style={{ fontSize: 14, marginTop: 4 }}>{a.schedule}</div>
          <div className="when">From {a.startDate}{a.endDate ? ` until ${a.endDate}` : ', ongoing'}</div>
          {a.user.id !== meId && <div className="when">For {personName(a.user)}{a.requestedBy.id !== a.user.id ? ` · requested by ${personName(a.requestedBy)}` : ''}</div>}
          {a.note && <div className="when">“{a.note}”</div>}
          {a.reviewNote && <div className="when">Reviewer: “{a.reviewNote}”</div>}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {showReview && (
            <>
              <button className="btn-sm btn-primary" disabled={busy} onClick={() => act('approve')}>Approve</button>
              <button className="btn-sm btn-danger" disabled={busy} onClick={() => act('reject')}>Decline</button>
            </>
          )}
          {canCancel && !showReview && (
            <button className="btn-sm btn-danger" disabled={busy} onClick={() => act('cancel')}>{a.status === 'APPROVED' ? 'Release seat' : 'Withdraw'}</button>
          )}
        </div>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {conflict && (
        <>
          <ConflictList conflict={conflict} />
          {conflict.code === 'RESERVATION_CONFLICTS' && (
            <div className="actions">
              <button className="btn-sm btn-danger" disabled={busy} onClick={() => act('approve', { cancelConflicts: true })}>Approve and cancel {conflict.details.length} reservation(s)</button>
            </div>
          )}
        </>
      )}
    </li>
  );
}

export default function AssignmentsPage() {
  const { data: session } = useSession();
  const role = session?.user?.role ?? 'STAFF';
  const meId = session?.user?.id ?? '';
  const reviewer = role === 'ADMIN' || role === 'MANAGER';
  const [tab, setTab] = useState<'mine' | 'review' | 'all'>('mine');
  const [rows, setRows] = useState<Assignment[] | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!meId) return;
    setRows(null);
    fetch('/api/assignments?view=' + tab).then((r) => r.json()).then(setRows).catch(() => setRows([]));
    if (reviewer) fetch('/api/assignments?view=review').then((r) => r.json()).then((r) => setReviewCount(Array.isArray(r) ? r.length : 0)).catch(() => {});
  }, [tab, meId, reload]);

  const tabs = useMemo(() => [
    { key: 'mine' as const, label: 'My seats' },
    ...(reviewer ? [{ key: 'review' as const, label: `To review${reviewCount ? ` (${reviewCount})` : ''}` }, { key: 'all' as const, label: role === 'ADMIN' ? 'All assignments' : 'My team' }] : []),
  ], [reviewer, reviewCount, role]);

  if (!session) return null;

  return (
    <div>
      <PageHeader title="My seat" subtitle="Set a desk or office as your assigned seat for the days and hours you're in." />
      <div className="assign-layout">
        <RequestForm role={role} meId={meId} onCreated={() => setReload((n) => n + 1)} />
        <div className="card">
          <div className="segmented" style={{ marginBottom: 16 }}>
            {tabs.map((t) => <button key={t.key} className={'btn-sm' + (tab === t.key ? ' btn-active' : '')} onClick={() => setTab(t.key)}>{t.label}</button>)}
          </div>
          {rows === null ? <div className="hint">Loading…</div> : rows.length === 0 ? (
            <div className="empty">{tab === 'review' ? 'Nothing waiting for review.' : 'No assigned seats yet.'}</div>
          ) : (
            <ul className="res-list">
              {rows.map((a) => <AssignmentRow key={a.id} a={a} meId={meId} canReview={reviewer} onChanged={() => setReload((n) => n + 1)} />)}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
