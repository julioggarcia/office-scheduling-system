import React, { useEffect, useState } from 'react';
import MapEditor from '../components/MapEditor';

type Building = { id: string; name: string; floors: { id: string; name: string }[] };

export default function MapEditorPage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [buildingId, setBuildingId] = useState('');
  const [floorId, setFloorId] = useState('');
  const [imageData, setImageData] = useState<string | undefined>(undefined);
  const [locations, setLocations] = useState<Array<{ id: string; label: string; points: string | null }>>([]);

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
    async function loadFloorImage() {
      if (!floorId) return;
      const res = await fetch('/api/floors/' + floorId);
      if (res.ok) {
        const j = await res.json();
        setImageData(j.imageContent || j.svgContent || undefined);
      } else {
        setImageData(undefined);
      }
    }
    loadFloorImage();
  }, [floorId]);

  useEffect(() => {
    async function loadLocations() {
      if (!floorId) { setLocations([]); return; }
      const res = await fetch('/api/locations?floorId=' + floorId);
      if (res.ok) {
        const j = await res.json();
        setLocations(j.map((l: any) => ({ id: l.id, label: l.label, points: l.polygon?.points || null, type: l.type, parentId: l.parentId })));
      } else {
        setLocations([]);
      }
    }
    loadLocations();
  }, [floorId]);

  async function refreshLocations() {
    if (!floorId) return;
    const res = await fetch('/api/locations?floorId=' + floorId);
    if (res.ok) {
      const j = await res.json();
      setLocations(j.map((l: any) => ({ id: l.id, label: l.label, points: l.polygon?.points || null, type: l.type, parentId: l.parentId })));
    }
  }

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
      <MapEditor imageUrl={imageData} floorId={floorId} existingPolygons={locations} onSaved={refreshLocations} />
    </div>
  );
}
