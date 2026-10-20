import React, { useEffect, useState } from 'react';
import type { NextPage } from 'next';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import prisma from '../lib/prisma';
import LocationMap from '../components/LocationMap';
import PageHeader from '../components/PageHeader';

// YYYY-MM-DD in local time (toISOString() would shift the date across UTC midnight)
function localIsoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type BuildingView = {
  id: string;
  name: string;
  floorCount: number;
  firstFloor?: { id: string; imageContent?: string | null; locations: Array<{ id: string; label?: string; parentId?: string | null; polygon?: { points: string } | null }> } | null;
};

const Home: NextPage<{ buildings: BuildingView[] }> = ({ buildings }) => {
  const [openMap, setOpenMap] = useState<string | null>(buildings.length ? buildings[0].id : null);
  const [selectedPolygon, setSelectedPolygon] = useState<{ buildingId: string; floorId: string; polygonId: string } | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => localIsoDate(new Date()));
  const [reservations, setReservations] = useState<any[]>([]);
  const [viewMonth, setViewMonth] = useState(() => new Date());
  const [currentDescendants, setCurrentDescendants] = useState<string[]>([]);
  const [blocks, setBlocks] = useState<AssignmentBlock[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

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

  function bFirstFloorLocationsForSelected(buildingId: string, floorId: string) {
    const b = buildings.find((bb) => bb.id === buildingId);
    if (!b || !b.firstFloor) return [] as { id: string; parentId?: string | null }[];
    if (b.firstFloor.id !== floorId) return b.firstFloor.locations as any;
    return b.firstFloor.locations as any;
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
      const locs = bFirstFloorLocationsForSelected(selectedPolygon.buildingId, selectedPolygon.floorId);
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

  function changeMonth(delta: number) {
    const d = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + delta, 1);
    setViewMonth(d);
  }

  function renderCalendar(buildingId: string, floorId: string) {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    const days: number[] = [];
    for (let d = 1; d <= end.getDate(); d++) days.push(d);
    const today = localIsoDate(new Date());

    return (
      <div className="panel">
        <div className="calendar-head">
          <button className="btn-sm" onClick={() => changeMonth(-1)} aria-label="Previous month">‹</button>
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
            if (date.getDay() === 0 || date.getDay() === 6) cls.push('weekend');
            return (
              <div key={d} className={cls.join(' ')} onClick={() => setSelectedDate(iso)}>{d}</div>
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
          <Link href="/admin/buildings" className="btn btn-primary">Add your first building</Link>
        </div>
      )}

      {buildings.map((b) => (
        <section key={b.id} className="card">
          <div className="card-header">
            <div>
              <h2>{b.name}</h2>
              <div className="hint">{b.floorCount} {b.floorCount === 1 ? 'floor' : 'floors'}</div>
            </div>
            <button onClick={() => setOpenMap((prev) => {
              const next = prev === b.id ? null : b.id;
              if (next === null) setSelectedPolygon(null);
              return next;
            })}>{openMap === b.id ? 'Hide map' : 'Show map'}</button>
          </div>

          {openMap === b.id && !b.firstFloor && (
            <div className="alert">This building has no floors yet.</div>
          )}

          {openMap === b.id && b.firstFloor && (
            <div className="reserve-layout">
              <div className="map-scroll">
                <LocationMap
                  imageUrl={b.firstFloor.imageContent ?? undefined}
                  polygons={b.firstFloor.locations.map((l) => ({ id: l.id, points: l.polygon?.points ?? '', label: l.label, parentId: l.parentId ?? undefined }))}
                  onPolygonClick={(pid) => setSelectedPolygon({ buildingId: b.id, floorId: b.firstFloor!.id, polygonId: pid })}
                  selectedId={selectedPolygon && selectedPolygon.buildingId === b.id && selectedPolygon.floorId === b.firstFloor!.id ? selectedPolygon.polygonId : undefined}
                  highlightedIds={
                    selectedPolygon && selectedPolygon.buildingId === b.id && selectedPolygon.floorId === b.firstFloor!.id ?
                      getDescendants(b.firstFloor.locations as any, selectedPolygon.polygonId) : []
                  }
                />
              </div>

              <div className="reserve-side">
                {selectedPolygon && selectedPolygon.buildingId === b.id && selectedPolygon.floorId === b.firstFloor.id ? (
                  <>
                    {renderCalendar(b.id, b.firstFloor.id)}
                    <div className="panel">
                      <div className="panel-title">
                        <span>{b.firstFloor.locations.find((l) => l.id === selectedPolygon.polygonId)?.label ?? 'Schedule'}</span>
                        <span className="hint">{new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                      </div>
                      <DaySchedule reservations={reservations} blocks={blocks} selectedDate={selectedDate} locationId={selectedPolygon.polygonId} descendants={currentDescendants} onReserved={() => setReloadKey((k) => k + 1)} />
                    </div>
                  </>
                ) : (
                  <div className="panel empty">Click a space on the map to see its calendar and daily schedule.</div>
                )}
              </div>
            </div>
          )}
        </section>
      ))}
    </div>
  );
};

function fmtHour(h: number) {
  return `${(h % 12) === 0 ? 12 : (h % 12)}${h < 12 || h === 24 ? 'am' : 'pm'}`;
}

type AssignmentBlock = { id: string; locationId: string; locationLabel: string; userId: string; userName: string; start: string; end: string };

function DaySchedule({ reservations, blocks, onReserved, selectedDate, locationId, descendants }: { reservations: any[]; blocks: AssignmentBlock[]; selectedDate: string; locationId: string; descendants: string[]; onReserved?: () => void }) {
  const { data: session } = useSession();
  const startHour = 4;
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

  const [selStart, setSelStart] = React.useState<number | null>(null);
  const [selEnd, setSelEnd] = React.useState<number | null>(null); // exclusive index
  const [dragging, setDragging] = React.useState<{ anchor: number } | null>(null);
  const [includeChildren, setIncludeChildren] = React.useState(false);
  const [status, setStatus] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = React.useState(false);

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
    const e = Math.max(anchor, index) + 1;
    for (let i = s; i < e; i++) if (unavailable[i]) return false;
    setSelStart(s);
    setSelEnd(e);
    return true;
  }

  // Mouse: press and drag. Touch: tap a start hour, then tap an end hour (dragging would fight page scrolling).
  function onHourPointerDown(i: number, e: React.PointerEvent) {
    if (unavailable[i]) return;
    const drag = e.pointerType === 'mouse';
    setStatus(null);
    if (selStart === null || selEnd === null) {
      setSelStart(i);
      setSelEnd(i + 1);
      if (drag) setDragging({ anchor: i });
      return;
    }
    if (i === selStart || i === selEnd - 1) {
      clearSelection();
      return;
    }
    // move whichever end of the selection is nearer
    const anchor = Math.abs(i - selStart) <= Math.abs(i - (selEnd - 1)) ? selEnd - 1 : selStart;
    if (setRangeFromAnchor(anchor, i) && drag) setDragging({ anchor });
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
    if (selStart === null || selEnd === null) return;
    const startH = hours[selStart];
    const endH = hours[selEnd - 1] + 1; // exclusive
    const [startLocal] = slotRange(startH);
    const [, endLocal] = slotRange(endH - 1);
    setBusy(true);
    setStatus(null);
    try {
      // the server books for the signed-in user
      const res = await fetch('/api/reservations/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ locationId, start: startLocal.toISOString(), end: endLocal.toISOString(), includeChildren: includeChildren && descendants.length > 0 }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus({ ok: false, text: j.error || 'Could not create the reservation' });
      } else {
        setStatus({ ok: true, text: `Reserved ${fmtHour(startH)} – ${fmtHour(endH)}` });
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
      <div className="schedule">
        {hours.map((h, idx) => {
          const isSelected = selStart !== null && selEnd !== null && idx >= selStart && idx < selEnd;
          const block = assigned[idx];
          // label the first hour of each assigned run
          const showAssignee = block && (idx === 0 || assigned[idx - 1]?.id !== block.id);
          return (
            <div key={h}
              className={'schedule-slot' + (reserved[idx] ? ' reserved' : '') + (block ? ' assigned' : '') + (isSelected ? ' selected' : '')}
              onPointerDown={(e) => onHourPointerDown(idx, e)}
              onPointerEnter={() => onHourPointerEnter(idx)}
              title={block ? `Assigned seat: ${block.userName}${block.locationId !== locationId ? ` (${block.locationLabel})` : ''}` : undefined}
              style={{ height: 28 }}>
              <div className="time">{fmtHour(h)}</div>
              <div className="fill">{showAssignee && <span className="slot-label">Assigned · {block!.userName}</span>}</div>
            </div>
          );
        })}
      </div>
      <div className="legend">
        <span className="l-free">Available</span>
        <span className="l-sel">Selected</span>
        <span className="l-res">Reserved</span>
        <span className="l-asg">Assigned seat</span>
      </div>

      {descendants.length > 0 && (
        <label className="hint" style={{ display: 'block', marginTop: 10 }}>
          <input type="checkbox" checked={includeChildren} onChange={(e) => setIncludeChildren(e.target.checked)} /> Also reserve the {descendants.length} space(s) inside
        </label>
      )}

      <div className="actions" style={{ marginTop: 12 }}>
        <button className="btn-primary" onClick={confirmRequest} disabled={selStart === null || busy} style={{ width: '100%', padding: '12px' }}>
          {busy ? 'Reserving…' : selStart !== null && selEnd !== null
            ? `Reserve ${fmtHour(hours[selStart])} – ${fmtHour(hours[selEnd - 1] + 1)}`
            : 'Tap or drag over hours to select'}
        </button>
      </div>
      {status && <div className={'alert' + (status.ok ? '' : ' alert-error')}>{status.text}</div>}
    </div>
  );
}

export async function getServerSideProps() {
  const buildings = await prisma.building.findMany({
    include: {
      floors: {
        orderBy: { order: 'asc' },
        include: {
          locations: {
            include: { polygon: true }
          }
        }
      }
    }
  });

  const out: BuildingView[] = buildings.map((b) => {
    const first = b.floors && b.floors.length > 0 ? b.floors[0] : null;
    return {
      id: b.id,
      name: b.name,
      floorCount: b.floors.length,
    firstFloor: first ? { id: first.id, imageContent: first.imageContent, locations: first.locations.map((l) => ({ id: l.id, label: l.label, parentId: (l as any).parentId ?? null, polygon: l.polygon ? { points: l.polygon.points } : null })) } : null
    };
  });

  return { props: { buildings: out } };
}

export default Home;
