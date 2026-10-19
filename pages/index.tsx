import React, { useEffect, useState } from 'react';
import type { NextPage } from 'next';
import Link from 'next/link';
import prisma from '../lib/prisma';
import LocationMap from '../components/LocationMap';

type BuildingView = {
  id: string;
  name: string;
  floorCount: number;
  firstFloor?: { id: string; imageContent?: string | null; locations: Array<{ id: string; label?: string; parentId?: string | null; polygon?: { points: string } | null }> } | null;
};

const Home: NextPage<{ buildings: BuildingView[] }> = ({ buildings }) => {
  const [openMap, setOpenMap] = useState<string | null>(buildings.length ? buildings[0].id : null);
  const [selectedPolygon, setSelectedPolygon] = useState<{ buildingId: string; floorId: string; polygonId: string } | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
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

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => changeMonth(-1)}>◀</button>
          <div style={{ fontWeight: 'bold' }}>{viewMonth.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</div>
          <button onClick={() => changeMonth(1)}>▶</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 40px)', gap: 4, marginTop: 8 }}>
          {days.map((d) => {
            const iso = new Date(year, month, d).toISOString().slice(0, 10);
            const isSelected = iso === selectedDate;
            return (
              <div key={d} onClick={() => setSelectedDate(iso)} style={{ width: 40, height: 40, lineHeight: '40px', textAlign: 'center', background: isSelected ? 'var(--accent)' : 'var(--panel)', color: isSelected ? '#fff' : 'var(--text)', border: '1px solid rgba(0,0,0,0.06)', cursor: 'pointer' }}>{d}</div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Office Reservation</h1>
      <nav>
        <Link href="/admin">Admin</Link> | <Link href="/map-editor">Map Editor</Link> | <Link href="/admin/upload-svg">Upload SVG</Link>
      </nav>

      {buildings.map((b) => (
        <section key={b.id} style={{ border: '1px solid #ddd', padding: 12, marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0 }}>{b.name} ({b.floorCount} floors)</h2>
            <button onClick={() => setOpenMap((prev) => {
              const next = prev === b.id ? null : b.id;
              if (next === null) setSelectedPolygon(null);
              return next;
            })}>{openMap === b.id ? 'Hide Map' : 'Show Map'}</button>
          </div>

          {openMap === b.id && b.firstFloor && (
            <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
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
                <div style={{ marginTop: 8 }}>
                  {selectedPolygon && selectedPolygon.buildingId === b.id && selectedPolygon.floorId === b.firstFloor.id ? (
                    renderCalendar(b.id, b.firstFloor.id)
                  ) : (
                    <div style={{ marginTop: 8, color: 'var(--muted)' }}>Click on a polygon to view its calendar and daily schedule.</div>
                  )}
                </div>
              </div>

              {selectedPolygon && selectedPolygon.buildingId === b.id && selectedPolygon.floorId === b.firstFloor.id && (
                <div style={{ width: 300 }}>
                  <div style={{ fontWeight: 'bold', marginBottom: 8 }}>Day Schedule ({selectedDate})</div>
                  <DaySchedule reservations={reservations} selectedDate={selectedDate} locationId={selectedPolygon.polygonId} descendants={currentDescendants} />
                </div>
              )}
            </div>
          )}
        </section>
      ))}
    </div>
  );
};

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

  // map reservations to positions
  const blocks = reservations.map((r) => {
    const s = new Date(r.start);
    const e = new Date(r.end);
    const top = ((s.getHours() + s.getMinutes() / 60) - startHour) / (endHour - startHour) * 100;
    const height = ( (e.getHours() + e.getMinutes() / 60) - (s.getHours() + s.getMinutes() / 60) ) / (endHour - startHour) * 100;
    return { id: r.id, top, height };
  });

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
    <div style={{ position: 'relative', height: 600, border: '1px solid rgba(0,0,0,0.06)', padding: 8, background: 'transparent' }}>
      {hours.map((h, idx) => {
        const isReserved = reserved[idx];
        const isSelected = selStart !== null && selEnd !== null && idx >= selStart && idx < selEnd;
        return (
          <div key={h}
            onMouseDown={() => onHourMouseDown(idx)}
            onMouseEnter={() => onHourMouseEnter(idx)}
            style={{ height: `${600 / (endHour - startHour + 1)}px`, borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', userSelect: 'none', cursor: isReserved ? 'not-allowed' : 'pointer', opacity: isReserved ? 0.5 : 1 }}>
            <div style={{ width: 50, fontSize: 12, color: 'var(--text)' }}>{(h % 12) === 0 ? 12 : (h % 12)}{h < 12 ? 'am' : 'pm'}</div>
            <div style={{ flex: 1, background: isSelected ? 'rgba(0,120,255,0.25)' : 'transparent', height: '100%' }} />
          </div>
        );
      })}

      {blocks.map((b) => (
        <div key={b.id} style={{ position: 'absolute', left: 60, right: 8, top: `${b.top}%`, height: `${b.height}%`, background: 'rgba(200,200,200,0.6)', borderRadius: 4 }} />
      ))}

      <div style={{ marginTop: 8 }}>
        <button onClick={confirmRequest} disabled={selStart === null}>Confirm Request</button>
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
