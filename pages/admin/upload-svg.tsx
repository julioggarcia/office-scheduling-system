import React, { useEffect, useState } from 'react';
import PageHeader from '../../components/PageHeader';

type Building = { id: string; name: string; floorCount: number; floors: { id: string; name: string }[] };

export default function UploadSvgPage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [buildingId, setBuildingId] = useState('');
  const [floorId, setFloorId] = useState('');
  const [svg, setSvg] = useState('');
  const [imageData, setImageData] = useState('');
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/buildings').then((r) => r.json()).then(setBuildings);
  }, []);

  useEffect(() => {
    if (buildings.length && !buildingId) {
      setBuildingId(buildings[0].id);
      setFloorId(buildings[0].floors?.[0]?.id || '');
    }
  }, [buildings]);

  function onBuildingChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    setBuildingId(id);
    const b = buildings.find((x) => x.id === id);
    setFloorId(b?.floors?.[0]?.id || '');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload: any = { buildingId, floorId };
    if (imageData) payload.image = imageData;
    const res = await fetch('/api/buildings/upload-svg', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const j = await res.json();
    setResult(JSON.stringify(j));
  }

  return (
    <div>
      <PageHeader title="Upload floorplan" subtitle="Attach a PNG, JPEG or SVG floorplan to a building floor." />
      <form onSubmit={submit} className="card" style={{ maxWidth: 720 }}>
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
            <select value={floorId} onChange={(e) => setFloorId(e.target.value)}>
              {buildings.find((b) => b.id === buildingId)?.floors.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="field">
          <label>Floorplan file</label>
          <input type="file" accept="image/*,image/svg+xml" onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            if (f.type === 'image/svg+xml') {
              const text = await f.text();
              // store svg into imageData as an SVG string as well
              setImageData(text);
            } else {
              // read as data URL
              const reader = new FileReader();
              reader.onload = () => {
                const result = reader.result as string;
                setImageData(result);
              };
              reader.readAsDataURL(f);
            }
          }} />
        </div>
        {imageData && (
          <div className="map-frame" style={{ marginBottom: 16 }}>
            <img
              alt="Floorplan preview"
              src={imageData.startsWith('data:') ? imageData : 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(imageData)}
              style={{ display: 'block', maxHeight: 320, maxWidth: '100%' }}
            />
          </div>
        )}
        <div className="actions">
          <button type="submit" className="btn-primary" disabled={!imageData || !floorId}>Save floorplan</button>
        </div>
        {result && <pre style={{ marginTop: 16 }}>{result}</pre>}
      </form>
    </div>
  );
}
