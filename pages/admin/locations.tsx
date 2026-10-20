import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import PageHeader from '../../components/PageHeader';

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
    <div>
      <PageHeader
        title="Locations"
        subtitle="Every bookable space. New locations are created by drawing them in the Map Editor."
        actions={<Link href="/map-editor" className="btn btn-primary">+ Draw new location</Link>}
      />
      {message && <div className="alert" style={{ marginBottom: 16 }}>{message}</div>}

      <div className="card" style={{ padding: 0 }}>
        {locations.length === 0 ? (
          <div className="empty">No locations yet. <Link href="/map-editor">Open the Map Editor</Link> to draw one.</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Label</th>
                  <th>Type</th>
                  <th>Floor</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((loc) => (
                  <tr key={loc.id}>
                    <td><strong>{loc.label}</strong></td>
                    <td><span className="badge">{loc.type}</span></td>
                    <td className="muted">{loc.floor?.name || loc.floorId}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <Link href="/admin/upload-svg" className="btn btn-sm" style={{ marginRight: 6 }}>Floorplan</Link>
                      <Link href="/map-editor" className="btn btn-sm">Edit shape</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
