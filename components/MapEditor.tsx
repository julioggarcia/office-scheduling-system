import React, { useState } from 'react';

type Point = [number, number];

export default function MapEditor({ imageUrl, onSave }: { imageUrl?: string; onSave: (points: Point[]) => void }) {
  const [points, setPoints] = useState<Point[]>([]);

  function onClick(e: React.MouseEvent<SVGSVGElement>) {
    const rect = (e.target as SVGElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setPoints((p) => [...p, [x, y]]);
  }

  function undo() {
    setPoints((p) => p.slice(0, -1));
  }

  function save() {
    onSave(points);
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
        <button onClick={save} disabled={points.length < 3}>
          Save Polygon
        </button>
      </div>
    </div>
  );
}
