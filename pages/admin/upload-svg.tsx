import React, { useEffect, useState } from 'react';

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
    <div style={{ padding: 20 }}>
      <h1>Upload/Paste SVG for Floor</h1>
      <form onSubmit={submit}>
        <div>
          <label>Building</label>
          <br />
          <select value={buildingId} onChange={onBuildingChange}>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>{b.name} ({b.floorCount} floors)</option>
            ))}
          </select>
        </div>
        <div style={{ marginTop: 8 }}>
          <label>Floor</label>
          <br />
          <select value={floorId} onChange={(e) => setFloorId(e.target.value)}>
            {buildings.find((b) => b.id === buildingId)?.floors.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
        <div style={{ marginTop: 8 }}>
          <label>Upload floor image (PNG/JPEG/SVG)</label>
          <br />
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
        <div style={{ marginTop: 8 }}>
          <button type="submit">Save SVG to Floor</button>
        </div>
      </form>

      {result && (
        <div style={{ marginTop: 12 }}>
          <h3>Result</h3>
          <pre>{result}</pre>
        </div>
      )}
    </div>
  );
}
