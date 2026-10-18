import React from 'react';

export default function LocationMap({ imageUrl, polygons, onPolygonClick }: { imageUrl?: string; polygons?: Array<{ id: string; points: string; label?: string }>; onPolygonClick?: (id: string) => void }) {
  return (
    <div style={{ border: '1px solid #ddd', display: 'inline-block' }}>
      <svg width={800} height={600} style={{ background: '#fff' }}>
        {imageUrl && <image href={imageUrl} width="800" height="600" />}
        {polygons?.map((poly) => (
          <g key={poly.id}>
            <polygon
              points={poly.points}
              fill="rgba(0,200,100,0.15)"
              stroke="#00c864"
              onClick={() => onPolygonClick?.(poly.id)}
            />
            {poly.label && <text x={10} y={20} style={{ fontSize: 12 }}>{poly.label}</text>}
          </g>
        ))}
      </svg>
    </div>
  );
}
