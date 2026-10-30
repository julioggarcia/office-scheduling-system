import React, { useEffect, useState } from 'react';
import type { NextPage } from 'next';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import prisma from '../lib/prisma';
import LocationMap, { type SpaceStatus } from '../components/LocationMap';
import PageHeader from '../components/PageHeader';

// YYYY-MM-DD in local time (toISOString() would shift the date across UTC midnight)
function localIsoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type FloorView = { id: string; name: string; imageContent?: string | null; locations: Array<{ id: string; label?: string; parentId?: string | null; polygon?: { points: string } | null }> };

type BuildingView = {
  id: string;
  name: string;
  floorCount: number;
  floors: FloorView[]; // lowest floor first
};

function Triangle({ dir }: { dir: 'up' | 'down' }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
      <path d={dir === 'up' ? 'M7 2 L13 12 L1 12 Z' : 'M7 12 L13 2 L1 2 Z'} fill="currentColor" />
    </svg>
  );
}

// fetches the floor image only once this map is on screen
function FloorMap({ floorId, ...props }: { floorId: string } & Omit<React.ComponentProps<typeof LocationMap>, 'imageUrl'>) {
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  useEffect(() => {
    let cancelled = false;
    fetch('/api/floors/' + floorId)
      .then((r) => (r.ok ? r.json() : null))
      .then((f) => { if (!cancelled) setImageUrl(f?.imageContent || f?.svgContent || undefined); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [floorId]);
  return <LocationMap {...props} imageUrl={imageUrl} />;
}

// bookings are Mon-Fri: a weekend start date moves to Monday
function firstBookableDate() {
  const d = new Date();
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return localIsoDate(d);
}

const Home: NextPage<{ buildings: BuildingView[] }> = ({ buildings }) => {
  const [openMap, setOpenMap] = useState<string | null>(buildings.length ? buildings[0].id : null);
  const [selectedPolygon, setSelectedPolygon] = useState<{ buildingId: string; floorId: string; polygonId: string } | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(firstBookableDate);
  const [reservations, setReservations] = useState<any[]>([]);
  const [viewMonth, setViewMonth] = useState(() => new Date());
  const [currentDescendants, setCurrentDescendants] = useState<string[]>([]);
  const [blocks, setBlocks] = useState<AssignmentBlock[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const { data: session } = useSession();
  // per-space availability for the shown floor and selected date, drawn on the map
  const [statusById, setStatusById] = useState<Record<string, SpaceStatus>>({});
  const sideRef = React.useRef<HTMLDivElement | null>(null);
  // index into building.floors of the floor being shown, per building (defaults to the lowest)
  const [floorIndex, setFloorIndex] = useState<Record<string, number>>({});

  // direction of the last floor change, drives the slide animation
  const [floorDir, setFloorDir] = useState<'up' | 'down' | null>(null);

  function changeFloor(b: BuildingView, delta: number) {
    const cur = floorIndex[b.id] ?? 0;
    const next = Math.min(Math.max(cur + delta, 0), b.floors.length - 1);
    if (next === cur) return;
    setFloorDir(delta > 0 ? 'up' : 'down');
    setFloorIndex((prev) => ({ ...prev, [b.id]: next }));
    // the selected space belongs to the floor we're leaving
    if (selectedPolygon?.buildingId === b.id) setSelectedPolygon(null);
  }

  function getAncestors(locations: { id: string; parentId?: string | null }[], id: string) {
    const out: string[] = [];
    let cur = locations.find((l) => l.id === id)?.parentId;
    while (cur && !out.includes(cur)) {
      out.push(cur);
      cur = locations.find((l) => l.id === cur)?.parentId;
    }
    return out;
  }

  function getDescendants(locations: { id: string; parentId?: string | null }[], id: string) {
    const map = new Map<string, string[]>();
    locations.forEach((l) => {
      const p = l.parentId ?? undefined;
      if (!map.has(p ?? 'root')) map.set(p ?? 'root', []);
      map.get(p ?? 'root')!.push(l.id);
    });
    const out: string[] = [];
    const stack = [id];
    while (stack.length) {
      const cur = stack.pop()!;
      const children = locations.filter((l) => l.parentId === cur).map((l) => l.id);
      for (const c of children) {
        out.push(c);
        stack.push(c);
      }
    }
    return out;
  }

  function floorLocations(buildingId: string, floorId: string) {
    const f = buildings.find((bb) => bb.id === buildingId)?.floors.find((ff) => ff.id === floorId);
    return (f?.locations ?? []) as { id: string; parentId?: string | null }[];
  }

  useEffect(() => {
    // clear descendants when selection cleared
    if (!selectedPolygon) {
      setReservations([]);
      setCurrentDescendants([]);
      setBlocks([]);
      return;
    }
    // when polygon selection changes, fetch reservations for that polygon's location and selectedDate
    const fetchRes = async () => {
      // compute location ids: include descendants so parent reflects child reservations
      const locs = floorLocations(selectedPolygon.buildingId, selectedPolygon.floorId);
      const descendants = getDescendants(locs, selectedPolygon.polygonId);
      const ids = [selectedPolygon.polygonId, ...descendants];
      const q = ids.map(encodeURIComponent).join(',');
      // compute local-day start/end in ISO so server can filter UTC-instants covering the same local day
      const localDayStart = new Date(selectedDate + 'T00:00:00');
      const localDayEnd = new Date(selectedDate + 'T23:59:59.999');
      const startIso = localDayStart.toISOString();
      const endIso = localDayEnd.toISOString();
      // assigned seats on this location, its children or its parent all block booking it
      const related = [...ids, ...getAncestors(locs, selectedPolygon.polygonId)].map(encodeURIComponent).join(',');
      fetch(`/api/assignments?locationIds=${related}&date=${selectedDate}`)
        .then((r) => (r.ok ? r.json() : { blocks: [] }))
        .then((j) => setBlocks(j.blocks || []))
        .catch(() => setBlocks([]));
      const res = await fetch(`/api/reservations?locationIds=${q}&startIso=${encodeURIComponent(startIso)}&endIso=${encodeURIComponent(endIso)}&pageSize=200`);
      if (res.ok) {
        const j = await res.json();
        // API may return { meta, reservations } or legacy array
        if (Array.isArray(j)) {
          setReservations(j);
        } else if (j && Array.isArray((j as any).reservations)) {
          setReservations((j as any).reservations);
        } else {
          setReservations([]);
        }
        setCurrentDescendants(descendants);
      } else {
        setReservations([]);
        setCurrentDescendants([]);
      }
    };
    fetchRes();
  }, [selectedPolygon, selectedDate, reloadKey]);

  const shownFloorId = buildings.find((b) => b.id === openMap)?.floors[floorIndex[openMap ?? ''] ?? 0]?.id;
  useEffect(() => {
    const floor = buildings.flatMap((b) => b.floors).find((f) => f.id === shownFloorId);
    if (!floor || !floor.locations.length) { setStatusById({}); return; }
    let cancelled = false;
    const ids = floor.locations.map((l) => encodeURIComponent(l.id)).join(',');
    const startIso = new Date(selectedDate + 'T00:00:00').toISOString();
    const endIso = new Date(selectedDate + 'T23:59:59.999').toISOString();
    Promise.all([
      fetch(`/api/reservations?locationIds=${ids}&startIso=${encodeURIComponent(startIso)}&endIso=${encodeURIComponent(endIso)}&pageSize=500`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`/api/assignments?locationIds=${ids}&date=${selectedDate}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([res, asg]) => {
      if (cancelled) return;
      const out: Record<string, SpaceStatus> = {};
      const list: any[] = Array.isArray(res) ? res : res?.reservations ?? [];
      for (const r of list) out[r.locationId] = r.userId === session?.user?.id ? 'mine' : out[r.locationId] === 'mine' ? 'mine' : 'busy';
      for (const b of asg?.blocks ?? []) if (!out[b.locationId]) out[b.locationId] = 'assigned';
      setStatusById(out);
    });
    return () => { cancelled = true; };
  }, [shownFloorId, selectedDate, reloadKey, session?.user?.id]);

  // on phones the schedule sits below the map: bring it into view after a space is picked
  useEffect(() => {
    if (!selectedPolygon || !window.matchMedia('(max-width: 900px)').matches) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    sideRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }, [selectedPolygon]);

  function changeMonth(delta: number) {
    const d = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + delta, 1);
    setViewMonth(d);
  }

  function renderCalendar() {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    const days: number[] = [];
    for (let d = 1; d <= end.getDate(); d++) days.push(d);
    const today = localIsoDate(new Date());
    const now = new Date();
    const atCurrentMonth = year === now.getFullYear() && month === now.getMonth();

    return (
      <div className="panel">
        <div className="calendar-head">
          <button className="btn-sm" onClick={() => changeMonth(-1)} disabled={atCurrentMonth} aria-label="Previous month">‹</button>
          <div className="month">{viewMonth.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</div>
          <button className="btn-sm" onClick={() => changeMonth(1)} aria-label="Next month">›</button>
        </div>
        <div className="calendar-grid">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => <div key={d} className="calendar-dow">{d}</div>)}
          {/* pad so day 1 lands under its weekday */}
          {Array.from({ length: start.getDay() }, (_, i) => <div key={'pad' + i} />)}
          {days.map((d) => {
            const date = new Date(year, month, d);
            const iso = localIsoDate(date);
            const cls = ['calendar-day'];
            if (iso === selectedDate) cls.push('selected');
            if (iso === today) cls.push('today');
            const weekend = date.getDay() === 0 || date.getDay() === 6;
            if (weekend) cls.push('weekend');
            return (
              <button key={d} type="button" className={cls.join(' ')} onClick={() => setSelectedDate(iso)}
                disabled={weekend || iso < today}
                aria-pressed={iso === selectedDate}
                aria-current={iso === today ? 'date' : undefined}
                aria-label={date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) + (weekend ? ', not bookable' : iso < today ? ', past' : '')}>{d}</button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Reserve a space" subtitle="Pick a building, click a desk or office on the floorplan, then choose a day and time." />

      {buildings.length === 0 && (
        <div className="card empty">
          <p>No buildings yet.</p>
          {session?.user?.role === 'ADMIN'
            ? <Link href="/admin/buildings" className="btn btn-primary">Add your first building</Link>
            : <p className="hint">Ask an admin to add your office.</p>}
        </div>
      )}

      {buildings.map((b) => {
        const idx = Math.min(floorIndex[b.id] ?? 0, Math.max(b.floors.length - 1, 0));
        const floor = b.floors[idx];
        const isTop = idx >= b.floors.length - 1;
        const isBottom = idx === 0;
        const selectedHere = selectedPolygon && floor && selectedPolygon.buildingId === b.id && selectedPolygon.floorId === floor.id ? selectedPolygon : null;
        return (
        <section key={b.id} className="card">
          <div className="card-header">
            <div>
              <h2>{b.name}</h2>
              <div className="hint">{b.floorCount} {b.floorCount === 1 ? 'floor' : 'floors'}</div>
            </div>
            <button aria-expanded={openMap === b.id} onClick={() => setOpenMap((prev) => {
              const next = prev === b.id ? null : b.id;
              if (next === null) setSelectedPolygon(null);
              return next;
            })}>{openMap === b.id ? 'Hide map' : 'Show map'}</button>
          </div>

          {openMap === b.id && !floor && (
            <div className="alert">This building has no floors yet.</div>
          )}

          {openMap === b.id && floor && (
            <>
            <div className="space-picker">
              <label htmlFor={'space-' + b.id}>Or choose from a list</label>
              <select id={'space-' + b.id} value={selectedHere?.polygonId ?? ''} onChange={(e) => e.target.value && setSelectedPolygon({ buildingId: b.id, floorId: floor.id, polygonId: e.target.value })}>
                <option value="">Pick a space…</option>
                {[...floor.locations].sort((x, y) => (x.label ?? '').localeCompare(y.label ?? '', undefined, { numeric: true })).map((l) => <option key={l.id} value={l.id}>{l.label || 'Unnamed space'}</option>)}
              </select>
            </div>
            <div className="reserve-layout">
              <div className="floor-map">
                {b.floors.length > 1 && (
                  <div className="floor-nav" role="group" aria-label="Floor">
                    <button type="button" className="floor-nav-btn" onClick={() => changeFloor(b, 1)} disabled={isTop} aria-label="Go up a floor" title={isTop ? 'Top floor' : 'Go up a floor'}>
                      <Triangle dir="up" />
                    </button>
                    <div className="floor-nav-label" aria-live="polite">{floor.name}</div>
                    <button type="button" className="floor-nav-btn" onClick={() => changeFloor(b, -1)} disabled={isBottom} aria-label="Go down a floor" title={isBottom ? 'Lowest floor' : 'Go down a floor'}>
                      <Triangle dir="down" />
                    </button>
                  </div>
                )}
                <div key={floor.id} className={'map-scroll' + (floorDir ? ' slide-' + floorDir : '')}>
                  <FloorMap
                    floorId={floor.id}
                    polygons={floor.locations.map((l) => ({ id: l.id, points: l.polygon?.points ?? '', label: l.label, parentId: l.parentId ?? undefined }))}
                    onPolygonClick={(pid) => setSelectedPolygon({ buildingId: b.id, floorId: floor.id, polygonId: pid })}
                    selectedId={selectedHere ? selectedHere.polygonId : undefined}
                    highlightedIds={selectedHere ? getDescendants(floor.locations as any, selectedHere.polygonId) : []}
                    statusById={statusById}
                  />
                </div>
              </div>

              <div className="reserve-side" ref={sideRef}>
                {selectedHere ? (
                  <>
                    {renderCalendar()}
                    <div className="panel">
                      <div className="panel-title">
                        <span>{floor.locations.find((l) => l.id === selectedHere.polygonId)?.label ?? 'Schedule'}</span>
                        <span className="hint">{new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                      </div>
                      <DaySchedule reservations={reservations} blocks={blocks} selectedDate={selectedDate} locationId={selectedHere.polygonId} locationLabel={floor.locations.find((l) => l.id === selectedHere.polygonId)?.label ?? 'This space'} descendants={currentDescendants} onReserved={() => setReloadKey((k) => k + 1)} />
                    </div>
                  </>
                ) : (
                  <div className="panel empty">Select a space on the map to see its calendar and schedule.</div>
                )}
              </div>
            </div>
            </>
          )}
        </section>
        );
      })}
    </div>
  );
};

// a run of hour boxes as the time it covers: boxes 8am..11am book 8am – 12pm
function fmtHours(first: number, last: number) {
  return `${fmtHour(first)} – ${fmtHour(last + 1)}`;
}

// minimal .ics so the booking can go into any calendar app
function icsHref(title: string, start: Date, end: Date) {
  const f = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT', `DTSTART:${f(start)}`, `DTEND:${f(end)}`, `SUMMARY:${title}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(body);
}

function fmtHour(h: number) {
  return `${(h % 12) === 0 ? 12 : (h % 12)}${h < 12 || h === 24 ? 'am' : 'pm'}`;
}

type AssignmentBlock = { id: string; locationId: string; locationLabel: string; userId: string; userName: string; start: string; end: string };

function DaySchedule({ reservations, blocks, onReserved, selectedDate, locationId, locationLabel, descendants }: { reservations: any[]; blocks: AssignmentBlock[]; selectedDate: string; locationId: string; locationLabel: string; descendants: string[]; onReserved?: () => void }) {
  const { data: session } = useSession();
  const startHour = 6;
  const endHour = 21; // 9pm
  const hours: number[] = [];
  for (let h = startHour; h <= endHour; h++) hours.push(h);

  // local [start, end) of an hour slot on the selected day
  const dayStart = new Date(`${selectedDate}T00:00:00`);
  const slotRange = (h: number) => {
    const s = new Date(dayStart);
    s.setHours(h, 0, 0, 0);
    const e = new Date(dayStart);
    e.setHours(h + 1, 0, 0, 0);
    return [s, e] as const;
  };
  const overlaps = (s: Date, e: Date, h: number) => {
    const [slotStart, slotEnd] = slotRange(h);
    return s < slotEnd && e > slotStart;
  };

  // what occupies each hour: a reservation, or someone else's assigned-seat schedule (your own assignment doesn't block you)
  const reserved = hours.map((h) => reservations.some((r) => overlaps(new Date(r.start), new Date(r.end), h)));
  const assigned = hours.map((h) => blocks.find((b) => b.userId !== session?.user?.id && overlaps(new Date(b.start), new Date(b.end), h)) || null);
  const unavailable = hours.map((_, i) => reserved[i] || !!assigned[i]);
  // consecutive hours held by the same assignment, listed under the grid since chips are too small to name the person
  const assignedRuns: { block: AssignmentBlock; from: number; to: number }[] = [];
  assigned.forEach((b, i) => {
    if (!b) return;
    const last = assignedRuns[assignedRuns.length - 1];
    if (last && last.block.id === b.id && last.to === i - 1) last.to = i;
    else assignedRuns.push({ block: b, from: i, to: i });
  });

  const [selStart, setSelStart] = React.useState<number | null>(null);
  // each hour box is a whole hour: picking 9am then 10am books 9:00 until the end of the 10am hour
  const [selEnd, setSelEnd] = React.useState<number | null>(null); // index of the last selected box, null = just selStart
  const [dragging, setDragging] = React.useState<{ anchor: number } | null>(null);
  const [status, setStatus] = React.useState<{ ok: boolean; text: string; when?: string; ics?: string } | null>(null);
  const [busy, setBusy] = React.useState(false);
  // firstH/lastH are box labels; the booking runs from firstH to lastH + 1
  const range = selStart === null ? null : { firstH: hours[selStart], lastH: hours[selEnd ?? selStart] };

  React.useEffect(() => {
    clearSelection();
    setStatus(null);
  }, [selectedDate, locationId]);

  function clearSelection() {
    setSelStart(null);
    setSelEnd(null);
  }

  function setRangeFromAnchor(anchor: number, index: number) {
    const s = Math.min(anchor, index);
    const e = Math.max(anchor, index);
    for (let i = s; i <= e; i++) if (unavailable[i]) return false;
    setSelStart(s);
    setSelEnd(e > s ? e : null);
    return true;
  }

  // Mouse: press and drag. Touch: tap a start hour, then tap an end hour (dragging would fight page scrolling).
  function onHourPointerDown(i: number, e: React.PointerEvent) {
    onHourPick(i, e.pointerType === 'mouse');
  }

  function onHourPick(i: number, drag: boolean) {
    setStatus(null);
    if (selStart !== null) {
      const last = selEnd ?? selStart;
      if (i >= selStart && i <= last) {
        // clicking a selected hour removes it: an edge shrinks the range, an inside hour trims everything after it
        if (selStart === last) clearSelection();
        else if (i === selStart) { setSelStart(i + 1); setSelEnd(last > i + 1 ? last : null); }
        else {
          const end = i === last ? i - 1 : i;
          setSelEnd(end > selStart ? end : null);
        }
        return;
      }
      // any other hour extends the range to it (ignored if something unavailable is in between)
      if (!setRangeFromAnchor(i < selStart ? last : selStart, i)) setStatus({ ok: false, text: 'An hour in between is already taken. Pick hours that are free.' });
      return;
    }
    if (unavailable[i]) return;
    setSelStart(i);
    setSelEnd(null);
    if (drag) setDragging({ anchor: i });
  }

  function onHourPointerEnter(i: number) {
    if (!dragging) return;
    setRangeFromAnchor(dragging.anchor, i);
  }

  React.useEffect(() => {
    const up = () => setDragging(null);
    window.addEventListener('pointerup', up);
    return () => window.removeEventListener('pointerup', up);
  }, []);

  async function confirmRequest() {
    if (!range) return;
    const startH = range.firstH;
    const endH = range.lastH + 1; // exclusive
    const [startLocal] = slotRange(startH);
    const [, endLocal] = slotRange(endH - 1);
    setBusy(true);
    setStatus(null);
    try {
      // the server books for the signed-in user
      const res = await fetch('/api/reservations/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ locationId, start: startLocal.toISOString(), end: endLocal.toISOString(), includeChildren: descendants.length > 0 }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus({ ok: false, text: j.error || 'Could not create the reservation' });
      } else {
        const day = new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
        setStatus({ ok: true, text: `${locationLabel} is yours`, when: `${day} · ${fmtHours(range.firstH, range.lastH)}`, ics: icsHref(`Desk: ${locationLabel}`, startLocal, endLocal) });
        clearSelection();
        onReserved?.();
      }
    } catch (err) {
      console.error(err);
      setStatus({ ok: false, text: 'Network error creating the reservation' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="hour-summary">
        {range ? (
          <>
            <strong>{fmtHours(range.firstH, range.lastH)}</strong>
            <span className="hint">{range.lastH - range.firstH + 1} {range.lastH === range.firstH ? 'hour' : 'hours'}</span>
            <button type="button" className="btn-sm hour-clear" onClick={clearSelection}>Clear</button>
          </>
        ) : (
          <span className="hint">Drag across hours, or pick a start and an end</span>
        )}
      </div>
      <div className="hour-grid">
        {hours.map((h, idx) => {
          const isSelected = selStart !== null && idx >= selStart && idx <= (selEnd ?? selStart);
          const isEdge = idx === selStart || idx === selEnd;
          const block = assigned[idx];
          const cls = ['hour-chip'];
          if (reserved[idx]) cls.push('reserved');
          else if (block) cls.push('assigned');
          if (isSelected) cls.push('selected');
          if (isEdge) cls.push('edge');
          return (
            <button key={h} type="button"
              className={cls.join(' ')}
              aria-disabled={unavailable[idx]}
              aria-label={fmtHour(h) + (reserved[idx] ? ', reserved' : block ? ', assigned seat' : '')}
              aria-pressed={isSelected}
              onPointerDown={(e) => onHourPointerDown(idx, e)}
              onPointerEnter={() => onHourPointerEnter(idx)}
              // keyboard activation (pointer clicks are handled on pointerdown)
              onClick={(e) => { if (e.detail === 0) onHourPick(idx, false); }}
              title={reserved[idx] ? 'Reserved' : block ? `Assigned seat: ${block.userName}${block.locationId !== locationId ? ` (${block.locationLabel})` : ''}` : undefined}>
              {fmtHour(h)}
            </button>
          );
        })}
      </div>
      <div className="legend">
        <span className="l-free">Available</span>
        <span className="l-sel">Selected</span>
        <span className="l-res">Reserved</span>
        <span className="l-asg">Assigned to someone</span>
      </div>
      {assignedRuns.length > 0 && (
        <ul className="assigned-list">
          {assignedRuns.map((run) => (
            <li key={run.block.id + run.from}>
              <span className="assigned-dot" aria-hidden />
              {fmtHours(hours[run.from], hours[run.to])} · assigned to <strong>{run.block.userName}</strong>
              {run.block.locationId !== locationId && <span className="hint"> ({run.block.locationLabel})</span>}
            </li>
          ))}
        </ul>
      )}

      {descendants.length > 0 && (
        <div className="hint" style={{ marginTop: 10 }}>Includes the {descendants.length} {descendants.length === 1 ? 'space' : 'spaces'} inside</div>
      )}

      <div className="reserve-cta">
        <button className="btn-primary" onClick={confirmRequest} disabled={selStart === null || busy}>
          {busy ? 'Reserving…' : range
            ? `Reserve ${fmtHours(range.firstH, range.lastH)}`
            : 'Select hours to reserve'}
        </button>
      </div>
      {status && (status.ok ? (
        <div role="status" className="confirm">
          <p className="confirm-title">{status.text}</p>
          <p className="confirm-when">{status.when}</p>
          <a className="btn btn-sm" href={status.ics} download="reservation.ics">Add to calendar</a>
        </div>
      ) : (
        <div role="alert" className="alert alert-error">{status.text}</div>
      ))}
    </div>
  );
}

export async function getServerSideProps() {
  const buildings = await prisma.building.findMany({
    include: {
      floors: {
        orderBy: { order: 'asc' },
        // images are big data URLs: left out here and fetched per floor when its map is shown
        select: {
          id: true,
          name: true,
          locations: { include: { polygon: true } },
        }
      }
    }
  });

  const out: BuildingView[] = buildings.map((b) => ({
    id: b.id,
    name: b.name,
    floorCount: b.floors.length,
    floors: b.floors.map((f) => ({
      id: f.id,
      name: f.name,
      locations: f.locations.map((l) => ({ id: l.id, label: l.label, parentId: (l as any).parentId ?? null, polygon: l.polygon ? { points: l.polygon.points } : null })),
    })),
  }));

  return { props: { buildings: out } };
}

export default Home;
