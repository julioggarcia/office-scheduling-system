import React from 'react';

export default function LocationMap({ imageUrl, polygons, onPolygonClick }: { imageUrl?: string; polygons?: Array<{ id: string; points: string; label?: string }>; onPolygonClick?: (id: string) => void }) {
  const width = 800;
  const height = 600;

  function renderPoints(pointsStr: string) {
    try {
      const pts = JSON.parse(pointsStr) as number[][]; // expect normalized [[x,y],...]
      return pts.map((p) => `${p[0] * width},${p[1] * height}`).join(' ');
    } catch (err) {
      // fallback: assume pointsStr is already an SVG points string
      return pointsStr;
    }
  }

  return (
    <div style={{ border: '1px solid #ddd', display: 'inline-block' }}>
      <svg width={width} height={height} style={{ background: '#fff' }}>
        {imageUrl && <image href={imageUrl} width={width} height={height} preserveAspectRatio="xMidYMid meet" />}
        {polygons?.map((poly) => (
          <g key={poly.id}>
            <polygon
              points={renderPoints(poly.points)}
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
