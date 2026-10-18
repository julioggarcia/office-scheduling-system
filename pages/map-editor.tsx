import dynamic from 'next/dynamic';
import React from 'react';
import MapEditor from '../components/MapEditor';

export default function MapEditorPage() {
  async function handleSave(points: [number, number][]) {
    // send to API to create polygon for location
    console.log('Saved points', points);
    // TODO: call API route to save
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Map Editor</h1>
      <p>Click to add points, create polygon outlining a desk/cubicle/office.</p>
      <MapEditor onSave={handleSave} imageUrl={undefined} />
    </div>
  );
}
