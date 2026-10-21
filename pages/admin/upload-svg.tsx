import React, { useEffect, useRef, useState } from 'react';
import PageHeader from '../../components/PageHeader';

type Building = { id: string; name: string; floorCount: number; floors: { id: string; name: string }[] };
type Pending = { name: string; size: number; data: string };
type Status = { kind: 'success' | 'error'; text: string } | null;

// keep in sync with the bodyParser sizeLimit in /api/buildings/upload-svg (base64 adds ~33%)
const MAX_BYTES = 7 * 1024 * 1024;

// floorplans are stored either as a data URL or as raw SVG markup
function toSrc(content: string) {
  return content.startsWith('data:') ? content : 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(content);
}

function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

function readFile(f: File): Promise<string> {
  if (f.type === 'image/svg+xml') return f.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(f);
  });
}

export default function UploadSvgPage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [buildingId, setBuildingId] = useState('');
  const [floorId, setFloorId] = useState('');
  const [current, setCurrent] = useState<string | null>(null);
  const [loadingCurrent, setLoadingCurrent] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  useEffect(() => {
    fetch('/api/buildings').then((r) => r.json()).then(setBuildings);
  }, []);

  useEffect(() => {
    if (buildings.length && !buildingId) {
      setBuildingId(buildings[0].id);
      setFloorId(buildings[0].floors?.[0]?.id || '');
    }
  }, [buildings]);

  // load the floor's existing floorplan whenever the selected floor changes
  useEffect(() => {
    setCurrent(null);
    if (!floorId) return;
    let cancelled = false;
    setLoadingCurrent(true);
    fetch('/api/floors/' + floorId)
      .then((r) => (r.ok ? r.json() : null))
      .then((f) => { if (!cancelled) setCurrent(f?.imageContent || f?.svgContent || null); })
      .catch(() => { if (!cancelled) setCurrent(null); })
      .finally(() => { if (!cancelled) setLoadingCurrent(false); });
    return () => { cancelled = true; };
  }, [floorId]);

  const building = buildings.find((b) => b.id === buildingId);
  const floor = building?.floors.find((f) => f.id === floorId);
  const floorLabel = floor && building ? `${floor.name} of ${building.name}` : 'this floor';

  function onBuildingChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    setBuildingId(id);
    const b = buildings.find((x) => x.id === id);
    setFloorId(b?.floors?.[0]?.id || '');
    setStatus(null);
  }

  async function acceptFile(f: File | undefined) {
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      setStatus({ kind: 'error', text: `"${f.name}" is not an image. Use a PNG, JPEG or SVG file.` });
      return;
    }
    if (f.size > MAX_BYTES) {
      setStatus({ kind: 'error', text: `"${f.name}" is ${formatSize(f.size)}; the limit is ${formatSize(MAX_BYTES)}.` });
      return;
    }
    try {
      setPending({ name: f.name, size: f.size, data: await readFile(f) });
      setStatus(null);
    } catch {
      setStatus({ kind: 'error', text: `Could not read "${f.name}".` });
    }
  }

  function openPicker() {
    fileInput.current?.click();
  }

  async function save() {
    if (!pending || !floorId) return;
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch('/api/buildings/upload-svg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buildingId, floorId, image: pending.data }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || (res.status === 413 ? 'File is too large' : `Upload failed (${res.status})`));
      setCurrent(pending.data);
      setStatus({ kind: 'success', text: `Floorplan "${pending.name}" saved to ${floorLabel}.` });
      setPending(null);
    } catch (err) {
      setStatus({ kind: 'error', text: String((err as Error).message || err) });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!floorId || !window.confirm(`Remove the floorplan from ${floorLabel}? Drawn locations are kept.`)) return;
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch('/api/buildings/upload-svg?floorId=' + encodeURIComponent(floorId), { method: 'DELETE' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || `Remove failed (${res.status})`);
      setCurrent(null);
      setStatus({ kind: 'success', text: `Floorplan removed from ${floorLabel}.` });
    } catch (err) {
      setStatus({ kind: 'error', text: String((err as Error).message || err) });
    } finally {
      setBusy(false);
    }
  }

  // dragenter/dragleave fire for every child element, so track depth to avoid flicker
  const dropHandlers = {
    onDragEnter: (e: React.DragEvent) => { e.preventDefault(); dragDepth.current++; setDragging(true); },
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; },
    onDragLeave: (e: React.DragEvent) => { e.preventDefault(); if (--dragDepth.current <= 0) { dragDepth.current = 0; setDragging(false); } },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      if (!busy) acceptFile(e.dataTransfer.files?.[0]);
    },
  };

  const shown = pending?.data ?? current;

  return (
    <div>
      <PageHeader title="Upload floorplan" subtitle="Attach a PNG, JPEG or SVG floorplan to a building floor." />
      <div className="card" style={{ maxWidth: 720 }}>
        <div className="row" style={{ marginBottom: 16 }}>
          <div className="field">
            <label>Building</label>
            <select value={buildingId} onChange={onBuildingChange}>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>{b.name} ({b.floorCount} floors)</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Floor</label>
            <select value={floorId} onChange={(e) => { setFloorId(e.target.value); setStatus(null); }}>
              {building?.floors.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label>Floorplan</label>
          <input
            ref={fileInput}
            type="file"
            accept="image/*,image/svg+xml"
            style={{ display: 'none' }}
            onChange={(e) => { acceptFile(e.target.files?.[0]); e.target.value = ''; }}
          />

          {loadingCurrent && !pending ? (
            <div className="dropzone"><span className="muted">Loading current floorplan…</span></div>
          ) : shown ? (
            <div className={'floorplan-preview' + (dragging ? ' dragging' : '')} {...dropHandlers}>
              <div className="floorplan-preview-head">
                {pending ? (
                  <>
                    <span className="badge badge-warning">Not saved yet</span>
                    <span className="floorplan-file">{pending.name} · {formatSize(pending.size)}</span>
                  </>
                ) : (
                  <span className="badge badge-success">Current floorplan</span>
                )}
              </div>
              <img alt="Floorplan preview" src={toSrc(shown)} />
              {dragging && <div className="drop-overlay">Drop to replace</div>}
            </div>
          ) : (
            <div
              className={'dropzone' + (dragging ? ' dragging' : '')}
              role="button"
              tabIndex={0}
              onClick={openPicker}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPicker(); } }}
              {...dropHandlers}
            >
              <div className="dropzone-icon" aria-hidden>🗺️</div>
              <div><strong>{dragging ? 'Drop to upload' : 'Drag & drop a floorplan here'}</strong></div>
              <div className="hint">or click to browse · PNG, JPEG or SVG up to {formatSize(MAX_BYTES)}</div>
            </div>
          )}
        </div>

        <div className="actions">
          {pending ? (
            <>
              <button type="button" className="btn-primary" onClick={save} disabled={busy || !floorId}>
                {busy ? 'Saving…' : current ? 'Replace floorplan' : 'Save floorplan'}
              </button>
              <button type="button" onClick={openPicker} disabled={busy}>Choose another file</button>
              <button type="button" onClick={() => { setPending(null); setStatus(null); }} disabled={busy}>Cancel</button>
            </>
          ) : current ? (
            <>
              <button type="button" onClick={openPicker} disabled={busy}>Change floorplan</button>
              <button type="button" className="btn-danger" onClick={remove} disabled={busy}>
                {busy ? 'Removing…' : 'Remove floorplan'}
              </button>
            </>
          ) : (
            <button type="button" className="btn-primary" onClick={openPicker} disabled={busy || !floorId || loadingCurrent}>Add floorplan</button>
          )}
        </div>

        {status && <div className={'alert' + (status.kind === 'error' ? ' alert-error' : ' alert-success')} role="status">{status.text}</div>}
      </div>
    </div>
  );
}
