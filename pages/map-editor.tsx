import React, { useEffect, useState } from 'react';
import MapEditor from '../components/MapEditor';

export default function MapEditorPage() {
  const [buildings, setBuildings] = useState<any[]>([]);
  const [buildingId, setBuildingId] = useState('');
  const [floorId, setFloorId] = useState('');
  const [svg, setSvg] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetch('/api/buildings').then((r) => r.json()).then((b) => setBuildings(b)).catch(console.error);
  }, []);

  useEffect(() => {
    if (buildings.length && !buildingId) {
      setBuildingId(buildings[0].id);
      setFloorId(buildings[0].floors?.[0]?.id || '');
    }
  }, [buildings]);

  useEffect(() => {
    async function loadSvg() {
      if (!floorId) return;
      const res = await fetch('/api/floors/' + floorId);
      if (res.ok) {
        const j = await res.json();
        setSvg(j.svgContent || undefined);
      } else {
        setSvg(undefined);
      }
    }
    loadSvg();
  }, [floorId]);

  return (
    <div style={{ padding: 20 }}>
      <h1>Map Editor</h1>
      <div style={{ marginBottom: 8 }}>
        <label>Building</label>
        <br />
        <select value={buildingId} onChange={(e) => { setBuildingId(e.target.value); const b = buildings.find((x) => x.id === e.target.value); setFloorId(b?.floors?.[0]?.id || ''); }}>
          {buildings.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
        </select>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label>Floor</label>
        <br />
        <select value={floorId} onChange={(e) => setFloorId(e.target.value)}>
          {buildings.find((b) => b.id === buildingId)?.floors.map((f) => (<option key={f.id} value={f.id}>{f.name}</option>))}
        </select>
      </div>
      <p>Click to add points, create polygon outlining a desk/cubicle/office. Provide a label and type, then save to create a Location.</p>
      <MapEditor imageUrl={svg} floorId={floorId} onSaved={() => { /* refresh list if needed */ }} />
    </div>
  );
}
