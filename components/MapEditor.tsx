import React, { useEffect, useState, useRef } from 'react';
import ReservationsPanel from './ReservationsPanel';

type Point = [number, number];

export default function MapEditor({ imageUrl, floorId, existingPolygons, onSaved }: { imageUrl?: string; floorId?: string; existingPolygons?: Array<{ id: string; points: string | null; label?: string; type?: string; parentId?: string | null }>; onSaved?: () => void }) {
  const [mode, setMode] = useState<'draw' | 'select'>('draw');
  const [points, setPoints] = useState<Point[]>([]);
  const [label, setLabel] = useState('');
  const [type, setType] = useState('desk');
  const [saving, setSaving] = useState(false);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const width = 800;
  const height = 600;

  // internal copy of existing polygons with pixel coords for editing
  const [polys, setPolys] = useState<Array<{ id: string; label?: string; type?: string; parentId?: string | null; points: Point[] }>>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [parentSelection, setParentSelection] = useState<string | ''>('');
  const [dragging, setDragging] = useState<{ polyId: string; idx: number } | null>(null);

  useEffect(() => {
    // load existingPolygons into pixel coords
    if (!existingPolygons) {
      setPolys([]);
      return;
    }
    const out = existingPolygons.map((p) => {
      let ptsArr: Point[] = [];
      if (!p.points) return { id: p.id, label: p.label, type: (p as any).type, parentId: (p as any).parentId ?? null, points: ptsArr };
      try {
        const pts = JSON.parse(p.points) as number[][];
        ptsArr = pts.map((pt) => [pt[0] * width, pt[1] * height]);
      } catch (err) {
        // fallback parse raw SVG points
        const pairs = (p.points as string).trim().split(/\s+/).map((s) => s.split(',').map((n) => parseFloat(n)));
        ptsArr = pairs.map((a) => [a[0], a[1]] as Point);
      }
      return { id: p.id, label: p.label, type: (p as any).type, parentId: (p as any).parentId ?? null, points: ptsArr };
    });
    setPolys(out);
  }, [existingPolygons]);

  function onClick(e: React.MouseEvent<SVGSVGElement>) {
    if (mode !== 'draw') return;
    const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setPoints((p) => [...p, [x, y]]);
  }

  function undo() {
    if (mode === 'draw') setPoints((p) => p.slice(0, -1));
  }

  async function saveNew() {
    if (!floorId) {
      alert('Please select a floor in the Map Editor before saving a polygon.');
      return;
    }
    if (!label) {
      alert('Please provide a label for this location');
      return;
    }
    const svgEl = svgRef.current;
    if (!svgEl) {
      alert('SVG element not available');
      return;
    }
    const rect = svgEl.getBoundingClientRect();
    const normalized = points.map((p) => [p[0] / rect.width, p[1] / rect.height]);

    setSaving(true);
    try {
      const res = await fetch('/api/locations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label, type, floorId, points: normalized }) });
      const j = await res.json();
      if (!res.ok) {
        alert('Error creating location: ' + JSON.stringify(j));
      } else {
        alert('Location created: ' + j.label);
        setPoints([]);
        setLabel('');
        setType('desk');
        onSaved?.();
      }
    } catch (err) {
      console.error(err);
      alert('Error creating location');
    } finally {
      setSaving(false);
    }
  }

  // select mode interactions
  function onPolyClick(id: string) {
    if (mode !== 'select') return;
    setSelectedId((prev) => (prev === id ? null : id));
  }

  // when selection changes, set parentSelection to the selected poly's parentId
  useEffect(() => {
    if (!selectedId) {
      setParentSelection('');
      return;
    }
    const p = polys.find((x) => x.id === selectedId);
    setParentSelection(p?.parentId ?? '');
  }, [selectedId, polys]);

  function startVertexDrag(polyId: string, idx: number, e: React.MouseEvent) {
    e.stopPropagation();
    setDragging({ polyId, idx });
  }

  function onSvgMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!dragging) return;
    const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setPolys((ps) => ps.map((p) => {
      if (p.id !== dragging.polyId) return p;
      const pts = p.points.slice();
      pts[dragging.idx] = [Math.max(0, Math.min(rect.width, x)), Math.max(0, Math.min(rect.height, y))];
      return { ...p, points: pts };
    }));
  }

  function onSvgMouseUp() {
    if (dragging) setDragging(null);
  }

  async function saveEdit() {
    if (!selectedId) return;
    const poly = polys.find((p) => p.id === selectedId);
    if (!poly) return;
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const rect = svgEl.getBoundingClientRect();
    const normalized = poly.points.map((p) => [p[0] / rect.width, p[1] / rect.height]);
    try {
      const res = await fetch(`/api/locations/${selectedId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label: poly.label, type: poly.type, points: normalized }) });
      if (!res.ok) {
        const j = await res.json();
        alert('Failed updating polygon: ' + JSON.stringify(j));
      } else {
        alert('Polygon updated');
        onSaved?.();
      }
    } catch (err) {
      console.error(err);
      alert('Error updating polygon');
    }
  }

  async function deleteSelected() {
    if (!selectedId) return;
    if (!confirm('Delete selected location?')) return;
    try {
      const res = await fetch(`/api/locations/${selectedId}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json();
        alert('Failed deleting: ' + JSON.stringify(j));
      } else {
        alert('Deleted');
        setSelectedId(null);
        onSaved?.();
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting');
    }
  }

  function renderExisting(polygons?: Array<{ id: string; points: string | null; label?: string; type?: string }>) {
    if (!polygons) return null;
    return polys.map((poly) => {
      const ptsStr = poly.points.map((p) => p.join(',')).join(' ');
      return (
        <g key={poly.id}>
          <polygon
            points={ptsStr}
            onClick={() => onPolyClick(poly.id)}
            style={{
              cursor: mode === 'select' ? 'pointer' : 'inherit',
              strokeWidth: poly.id === selectedId ? 2.5 : 1.5,
              fill: poly.id === selectedId ? 'rgba(99,102,241,0.25)' : 'rgba(16,185,129,0.16)',
              stroke: poly.id === selectedId ? 'var(--accent)' : 'var(--success)',
            }}
          />
          {poly.id === selectedId && poly.points.map((pt, idx) => (
            <circle key={idx} cx={pt[0]} cy={pt[1]} r={6} fill="var(--accent)" onMouseDown={(e) => startVertexDrag(poly.id, idx, e)} />
          ))}
        </g>
      );
    });
  }

  return (
    <div>
      <div className="toolbar">
        <div className="segmented">
          <button onClick={() => setMode('draw')} className={mode === 'draw' ? 'btn-active' : ''}>✎ Draw</button>
          <button onClick={() => setMode('select')} className={mode === 'select' ? 'btn-active' : ''}>⬚ Select / edit</button>
        </div>
        <span className="hint">{mode === 'draw' ? 'Click on the floorplan to add points (3+ to make a shape).' : 'Click a shape to select it, then drag its corners to adjust.'}</span>
      </div>

      <div className="map-scroll">
      <div className="map-frame">
        <svg ref={svgRef} width={width} height={height} onClick={onClick} onMouseMove={onSvgMouseMove} onMouseUp={onSvgMouseUp} style={{ cursor: mode === 'draw' ? 'crosshair' : 'default' }}>
          {imageUrl && <image href={imageUrl} width={width} height={height} preserveAspectRatio="xMidYMid meet" />}
          {renderExisting(existingPolygons)}
          {mode === 'draw' && points.length > 0 && (
            <>
              <polygon points={points.map((p) => p.join(',')).join(' ')} style={{ fill: 'rgba(99,102,241,0.2)', stroke: 'var(--accent)', strokeWidth: 2, strokeDasharray: '6 4' }} />
              {points.map((p, i) => (
                <circle key={i} cx={p[0]} cy={p[1]} r={4} fill="var(--accent)" />
              ))}
            </>
          )}
        </svg>
      </div>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        {mode === 'draw' ? (
          <div className="row">
            <div className="field">
              <label>Label</label>
              <input placeholder="e.g. Desk 4B" value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
            <div className="field">
              <label>Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="desk">Desk</option>
                <option value="cubicle">Cubicle</option>
                <option value="office">Office</option>
                <option value="other">Other</option>
              </select>
            </div>
            <button onClick={undo} disabled={points.length === 0}>↶ Undo point</button>
            <button className="btn-primary" onClick={saveNew} disabled={points.length < 3 || saving}>{saving ? 'Saving…' : 'Create location'}</button>
          </div>
        ) : !selectedId ? (
          <div className="hint">Select a shape on the map to edit it, link it to a parent, or manage its reservations.</div>
        ) : (
          <>
            <div className="row">
              <div className="field">
                <label>Label</label>
                <input value={polys.find(p => p.id === selectedId)?.label ?? ''} onChange={(e) => setPolys(ps => ps.map(p => p.id === selectedId ? { ...p, label: e.target.value } : p))} />
              </div>
              <div className="field">
                <label>Type</label>
                <select value={polys.find(p => p.id === selectedId)?.type ?? 'desk'} onChange={(e) => setPolys(ps => ps.map(p => p.id === selectedId ? { ...p, type: e.target.value } : p))}>
                  <option value="desk">Desk</option>
                  <option value="cubicle">Cubicle</option>
                  <option value="office">Office</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <button className="btn-primary" onClick={saveEdit} disabled={!selectedId}>Save changes</button>
              <button className="btn-danger" onClick={deleteSelected} disabled={!selectedId}>Delete</button>

              {/* Parent linkage UI */}
              <div className="field">
                <label>Parent</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select value={parentSelection ?? ''} onChange={(e) => setParentSelection(e.target.value)}>
                    <option value="">No parent</option>
                    {polys.filter(p => p.id !== selectedId).map(p => (
                      <option key={p.id} value={p.id}>{p.label || p.id} {p.type ? `(${p.type})` : ''}</option>
                    ))}
                  </select>
                  <button onClick={async () => {
                    if (!selectedId) return;
                    try {
                      const body: any = { parentId: parentSelection || null };
                      const res = await fetch(`/api/locations/${selectedId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
                      if (!res.ok) {
                        const j = await res.json();
                        alert('Failed setting parent: ' + JSON.stringify(j));
                      } else {
                        alert('Parent updated');
                        onSaved?.();
                        setPolys(ps => ps.map(pp => pp.id === selectedId ? { ...pp, parentId: parentSelection || null } : pp));
                      }
                    } catch (err) {
                      console.error(err);
                      alert('Error updating parent');
                    }
                  }} disabled={!selectedId}>Apply</button>
                </div>
              </div>
            </div>

            {/* Reservations management for admins */}
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <h3>Manage reservations</h3>
              <ReservationsPanel locationId={selectedId!} onChanged={async () => { onSaved?.(); }} polys={polys} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
