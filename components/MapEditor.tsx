import React, { useState } from 'react';

type Point = [number, number];

export default function MapEditor({ imageUrl, floorId, onSaved }: { imageUrl?: string; floorId?: string; onSaved?: () => void }) {
  const [points, setPoints] = useState<Point[]>([]);
  const [label, setLabel] = useState('');
  const [type, setType] = useState('desk');
  const [saving, setSaving] = useState(false);

  function onClick(e: React.MouseEvent<SVGSVGElement>) {
    const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setPoints((p) => [...p, [x, y]]);
  }

  function undo() {
    setPoints((p) => p.slice(0, -1));
  }

  async function save() {
    if (!floorId) {
      alert('Please select a floor in the Map Editor before saving a polygon.');
      return;
    }
    if (!label) {
      alert('Please provide a label for this location');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/locations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label, type, floorId, points }) });
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

  return (
    <div>
      <div style={{ border: '1px solid #ccc', display: 'inline-block' }}>
        <svg width={800} height={600} onClick={onClick} style={{ background: '#f8f8f8' }}>
          {imageUrl && <image href={imageUrl} width="800" height="600" />}
          {points.length > 0 && (
            <polygon points={points.map((p) => p.join(',')).join(' ')} fill="rgba(0,120,255,0.2)" stroke="#0078ff" />
          )}
          {points.map((p, i) => (
            <circle key={i} cx={p[0]} cy={p[1]} r={4} fill="#0078ff" />
          ))}
        </svg>
      </div>
      <div style={{ marginTop: 8 }}>
        <button onClick={undo} disabled={points.length === 0} style={{ marginRight: 8 }}>
          Undo
        </button>
        <input placeholder="Location label" value={label} onChange={(e) => setLabel(e.target.value)} style={{ marginRight: 8 }} />
        <select value={type} onChange={(e) => setType(e.target.value)} style={{ marginRight: 8 }}>
          <option value="desk">Desk</option>
          <option value="cubicle">Cubicle</option>
          <option value="office">Office</option>
          <option value="other">Other</option>
        </select>
        <button onClick={save} disabled={points.length < 3 || saving}>
          {saving ? 'Saving...' : 'Save Location (create)'}
        </button>
      </div>
    </div>
  );
}
