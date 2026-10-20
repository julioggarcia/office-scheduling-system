import React, { useEffect, useState } from 'react';
import type { NextPage } from 'next';
import Link from 'next/link';
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
      const res = await fetch(`/api/reservations?locationIds=${q}&startIso=${encodeURIComponent(startIso)}&endIso=${encodeURIComponent(endIso)}`);
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
  }, [selectedPolygon, selectedDate]);

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
                      <DaySchedule reservations={reservations} selectedDate={selectedDate} locationId={selectedPolygon.polygonId} descendants={currentDescendants} />
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

function DaySchedule({ reservations, onRequest, selectedDate, locationId, descendants }: { reservations: any[]; selectedDate: string; locationId: string; descendants: string[]; onRequest?: (startIso: string, endIso: string, includeChildren: boolean) => void }) {
  const startHour = 4;
  const endHour = 21; // 9pm
  const hours: number[] = [];
  for (let h = startHour; h <= endHour; h++) hours.push(h);

  // reserved boolean per hour
  const reserved = new Array(hours.length).fill(false);
  reservations.forEach((r) => {
    const s = new Date(r.start);
    const e = new Date(r.end);
    for (let i = 0; i < hours.length; i++) {
      const h = hours[i];
      const slotStart = new Date(s);
      slotStart.setHours(h, 0, 0, 0);
      const slotEnd = new Date(s);
      slotEnd.setHours(h + 1, 0, 0, 0);
      // if overlap
      if (s < slotEnd && e > slotStart) reserved[i] = true;
    }
  });

  const [selStart, setSelStart] = React.useState<number | null>(null);
  const [selEnd, setSelEnd] = React.useState<number | null>(null); // exclusive index
  const [dragging, setDragging] = React.useState<{ anchor: number } | null>(null);

  function clearSelection() {
    setSelStart(null);
    setSelEnd(null);
  }

  function setRangeFromAnchor(anchor: number, index: number) {
    const s = Math.min(anchor, index);
    const e = Math.max(anchor, index) + 1;
    // ensure no reserved hours in [s,e)
    for (let i = s; i < e; i++) if (reserved[i]) return false;
    setSelStart(s);
    setSelEnd(e);
    return true;
  }

  function onHourMouseDown(i: number) {
    if (reserved[i]) return;
    if (selStart === null) {
      // start new selection
      setSelStart(i);
      setSelEnd(i + 1);
      setDragging({ anchor: i });
      return;
    }
    // if selection exists, decide whether to adjust start or end
    const currentStart = selStart!;
    const currentEnd = selEnd!;
    const distToStart = Math.abs(i - currentStart);
    const distToEnd = Math.abs(i - (currentEnd - 1));
    if (i === currentStart) {
      clearSelection();
      return;
    }
    if (i === currentEnd - 1) {
      clearSelection();
      return;
    }
    if (distToStart <= distToEnd) {
      // adjust start
      // ensure no reserved between i and currentEnd
      const s = Math.min(i, currentEnd - 1);
      const e = Math.max(i, currentEnd - 1) + 1;
      for (let k = s; k < e; k++) if (reserved[k]) return;
      setSelStart(s);
      setSelEnd(e);
      setDragging({ anchor: i });
    } else {
      // adjust end
      const s = Math.min(currentStart, i);
      const e = Math.max(currentStart, i) + 1;
      for (let k = s; k < e; k++) if (reserved[k]) return;
      setSelStart(s);
      setSelEnd(e);
      setDragging({ anchor: currentStart });
    }
  }

  function onHourMouseEnter(i: number) {
    if (!dragging) return;
    setRangeFromAnchor(dragging.anchor, i);
  }

  function onMouseUp() {
    setDragging(null);
  }

  React.useEffect(() => {
    window.addEventListener('mouseup', onMouseUp);
    return () => window.removeEventListener('mouseup', onMouseUp);
  }, []);

  async function confirmRequest() {
    if (selStart === null || selEnd === null) return alert('No selection');
    const startH = hours[selStart];
    const endH = hours[selEnd - 1] + 1; // exclusive
    // construct local Date objects (no trailing Z) so the intended local hour is preserved.
    const startLocal = new Date(`${selectedDate}T${String(startH).padStart(2, '0')}:00:00`);
    const endLocal = new Date(`${selectedDate}T${String(endH).padStart(2, '0')}:00:00`);
    const startIso = startLocal.toISOString();
    const endIso = endLocal.toISOString();
    // ask for userid
    const userId = prompt('Enter your user id to create the reservation (internal id)');
    if (!userId) return;
    // only ask to include sublocations when there are descendants
    let includeChildren = false;
    if (descendants && descendants.length > 0) {
      includeChildren = confirm(`Include sublocations (${descendants.length})?`);
    }

    try {
      const res = await fetch('/api/reservations/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ locationId, userId, start: startIso, end: endIso, includeChildren }) });
      if (!res.ok) {
        const j = await res.json();
        alert('Failed creating reservation: ' + JSON.stringify(j));
      } else {
        alert('Reservation requested');
        onRequest?.(startIso, endIso, includeChildren);
        clearSelection();
      }
    } catch (err) {
      console.error(err);
      alert('Error creating reservation');
    }
  }

  return (
    <div>
      <div className="schedule">
        {hours.map((h, idx) => {
          const isReserved = reserved[idx];
          const isSelected = selStart !== null && selEnd !== null && idx >= selStart && idx < selEnd;
          return (
            <div key={h}
              className={'schedule-slot' + (isReserved ? ' reserved' : '') + (isSelected ? ' selected' : '')}
              onMouseDown={() => onHourMouseDown(idx)}
              onMouseEnter={() => onHourMouseEnter(idx)}
              style={{ height: 30 }}>
              <div className="time">{(h % 12) === 0 ? 12 : (h % 12)} {h < 12 ? 'am' : 'pm'}</div>
              <div className="fill" />
            </div>
          );
        })}
      </div>
      <div className="legend">
        <span className="l-free">Available</span>
        <span className="l-sel">Selected</span>
        <span className="l-res">Reserved</span>
      </div>

      <div className="actions" style={{ marginTop: 12 }}>
        <button className="btn-primary" onClick={confirmRequest} disabled={selStart === null} style={{ width: '100%' }}>
          {selStart !== null && selEnd !== null
            ? `Request ${fmtHour(hours[selStart])} – ${fmtHour(hours[selEnd - 1] + 1)}`
            : 'Drag over hours to select'}
        </button>
      </div>
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
