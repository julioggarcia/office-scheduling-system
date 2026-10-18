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
      <p>Locations must be created by drawing polygons on the floor SVG in the <a href="/map-editor">Map Editor</a>. Open the Map Editor, select the building and floor, draw a polygon, provide a label and type, then click Save to persist the location and polygon.</p>
      <p style={{ color: '#666' }}>The inline create form has been removed to ensure locations are only created from polygons.</p>
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
