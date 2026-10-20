import React, { useRef, useState } from 'react';
import PolygonHoverTooltip from './PolygonHoverTooltip';

export default function LocationMap({ imageUrl, polygons, onPolygonClick, selectedId, highlightedIds }: { imageUrl?: string; polygons?: Array<{ id: string; points: string; label?: string; parentId?: string }>; onPolygonClick?: (id: string) => void; selectedId?: string; highlightedIds?: string[] }) {
  const width = 800;
  const height = 600;
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [hover, setHover] = useState<{ x: number; y: number; label?: string; visible: boolean }>({ x: 0, y: 0, label: undefined, visible: false });

  function renderPoints(pointsStr: string) {
    try {
      const pts = JSON.parse(pointsStr) as number[][]; // expect normalized [[x,y],...]
      return pts.map((p) => `${p[0] * width},${p[1] * height}`).join(' ');
    } catch (err) {
      // fallback: assume pointsStr is already an SVG points string
      return pointsStr;
    }
  }

  function handleMouseEnter(e: React.MouseEvent, poly: { id: string; points: string; label?: string }) {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHover({ x: e.clientX - rect.left, y: e.clientY - rect.top, label: poly.label, visible: true });
  }
  function handleMouseMove(e: React.MouseEvent) {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHover((h) => ({ ...h, x: e.clientX - rect.left, y: e.clientY - rect.top }));
  }
  function handleMouseLeave() {
    setHover({ x: 0, y: 0, label: undefined, visible: false });
  }

  const selectedLabel = polygons?.find((p) => p.id === selectedId)?.label;

  return (
    <div ref={wrapperRef} className="map-frame">
      <svg width={width} height={height}>
        {imageUrl && <image href={imageUrl} width={width} height={height} preserveAspectRatio="xMidYMid meet" />}
        {polygons?.map((poly) => (
          <g key={poly.id}>
            <polygon
              points={renderPoints(poly.points)}
              onClick={() => onPolygonClick?.(poly.id)}
              onMouseEnter={(e) => handleMouseEnter(e, poly)}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              style={{
                cursor: 'pointer',
                strokeWidth: poly.id === selectedId ? 2.5 : 1.5,
                fill: poly.id === selectedId ? 'rgba(99,102,241,0.3)' : (highlightedIds && highlightedIds.includes(poly.id) ? 'rgba(245,158,11,0.18)' : 'rgba(16,185,129,0.16)'),
                stroke: poly.id === selectedId ? 'var(--accent)' : (highlightedIds && highlightedIds.includes(poly.id) ? 'var(--warning)' : 'var(--success)'),
              }}
            />
          </g>
        ))}
        {/* show only selected polygon name in upper-left */}
        {selectedLabel && <text x={10} y={16} style={{ fontSize: 14, fontWeight: 'bold', fill: 'var(--text)' }}>{selectedLabel}</text>}
      </svg>
      <PolygonHoverTooltip x={hover.x} y={hover.y} label={hover.label} visible={hover.visible} />
    </div>
  );
}
