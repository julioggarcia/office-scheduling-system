import React from 'react';
import Link from 'next/link';
import PageHeader from '../../components/PageHeader';

export default function AddLocationPage() {
  return (
    <div>
      <PageHeader title="Add a location" subtitle="Locations are created by drawing shapes over a floorplan." />
      <div className="card" style={{ maxWidth: 720 }}>
        <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <li>
            <Link href="/admin/buildings">Add a building</Link> if it doesn't exist yet.
          </li>
          <li>
            <Link href="/admin/upload-svg">Upload a floorplan</Link> (image or SVG) for the floor.
          </li>
          <li>
            Open the <Link href="/map-editor">Map Editor</Link>, pick the building and floor, draw an outline around a desk, cubicle or office, give it a label and type, then click <strong>Create location</strong>.
          </li>
        </ol>
      </div>
    </div>
  );
}
