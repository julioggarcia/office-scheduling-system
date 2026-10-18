import React, { useEffect, useState } from 'react';

type Building = { id: string; name: string; floors: { id: string; name: string }[] };
type Location = { id: string; label: string; type: string; floorId: string; floor?: { id: string; name: string } };

export default function ManageLocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [label, setLabel] = useState('');
  const [type, setType] = useState('desk');
  const [buildingId, setBuildingId] = useState('');
  const [floorId, setFloorId] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchLocations();
    fetch('/api/buildings').then((r) => r.json()).then((b) => setBuildings(b)).catch(console.error);
  }, []);

  useEffect(() => {
    if (buildings.length && !buildingId) {
      setBuildingId(buildings[0].id);
      setFloorId(buildings[0].floors?.[0]?.id || '');
    }
  }, [buildings]);

  async function fetchLocations() {
    try {
      const res = await fetch('/api/locations');
      const j = await res.json();
      setLocations(j);
    } catch (err) {
      console.error(err);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (!label || !floorId) {
      setMessage('Label and floor are required');
      return;
    }
    try {
      const res = await fetch('/api/locations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label, floorId, type, imageUrl }) });
      const j = await res.json();
      if (!res.ok) {
        setMessage('Error: ' + JSON.stringify(j));
      } else {
        setMessage('Created location ' + j.label);
        setLabel('');
        setType('desk');
        setImageUrl('');
        await fetchLocations();
      }
    } catch (err) {
      console.error(err);
      setMessage('Error creating location');
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Manage Locations</h1>
      <p>
        <a href="/admin">Back to Admin</a>
      </p>

      <h2>Create Location</h2>
      <form onSubmit={submit}>
        <div>
          <label>Label</label>
          <br />
          <input value={label} onChange={(e) => setLabel(e.target.value)} required />
        </div>
        <div style={{ marginTop: 8 }}>
          <label>Type</label>
          <br />
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="desk">Desk</option>
            <option value="cubicle">Cubicle</option>
            <option value="office">Office</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div style={{ marginTop: 8 }}>
          <label>Building</label>
          <br />
          <select value={buildingId} onChange={(e) => { setBuildingId(e.target.value); const b = buildings.find(x => x.id === e.target.value); setFloorId(b?.floors?.[0]?.id || ''); }}>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
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
          <label>Image URL (optional)</label>
          <br />
          <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
        </div>
        <div style={{ marginTop: 8 }}>
          <button type="submit">Create</button>
        </div>
      </form>
      {message && <div style={{ marginTop: 8 }}><strong>{message}</strong></div>}

      <h2 style={{ marginTop: 20 }}>Existing Locations</h2>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Label</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Type</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Floor</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {locations.map((loc) => (
            <tr key={loc.id}>
              <td style={{ padding: '6px 0' }}>{loc.label}</td>
              <td style={{ padding: '6px 0' }}>{loc.type}</td>
              <td style={{ padding: '6px 0' }}>{loc.floor?.name || loc.floorId}</td>
              <td style={{ padding: '6px 0' }}>
                <a href={`/admin/upload-svg`} style={{ marginRight: 8 }}>Edit Map</a>
                <a href={`/map-editor`}>Edit Polygon</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
