import React, { useRef, useState } from 'react';
import PolygonHoverTooltip from './PolygonHoverTooltip';

export type SpaceStatus = 'free' | 'busy' | 'assigned' | 'mine';

const STATUS_TEXT: Record<SpaceStatus, string> = {
  free: 'free all day',
  busy: 'some hours taken',
  assigned: 'has an assigned seat',
  mine: 'reserved by you',
};

export default function LocationMap({ imageUrl, polygons, onPolygonClick, selectedId, highlightedIds, statusById }: { imageUrl?: string; polygons?: Array<{ id: string; points: string; label?: string; parentId?: string }>; onPolygonClick?: (id: string) => void; selectedId?: string; highlightedIds?: string[]; statusById?: Record<string, SpaceStatus> }) {
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
    <div>
      <div ref={wrapperRef} className="map-frame map-responsive">
        {/* viewBox keeps polygon coordinates fixed while the map shrinks to fit phone screens */}
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ height: 'auto', aspectRatio: `${width} / ${height}` }}>
          <defs>
            <pattern id="space-busy" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="8" height="8" className="space-busy-bg" />
              <line x1="0" y1="0" x2="0" y2="8" className="space-busy-line" strokeWidth="3" />
            </pattern>
          </defs>
          {imageUrl && <image href={imageUrl} width={width} height={height} preserveAspectRatio="xMidYMid meet" />}
          {polygons?.map((poly) => {
            const status = statusById?.[poly.id] ?? 'free';
            const cls = ['space', 'space-' + status];
            if (poly.id === selectedId) cls.push('space-selected');
            else if (highlightedIds?.includes(poly.id)) cls.push('space-child');
            const name = poly.label || 'Unnamed space';
            return (
              <g key={poly.id}>
                <polygon
                  className={cls.join(' ')}
                  points={renderPoints(poly.points)}
                  role="button"
                  tabIndex={0}
                  aria-label={`${name}, ${STATUS_TEXT[status]}`}
                  aria-pressed={poly.id === selectedId}
                  onClick={() => onPolygonClick?.(poly.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPolygonClick?.(poly.id); } }}
                  onMouseEnter={(e) => handleMouseEnter(e, poly)}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                />
              </g>
            );
          })}
          {/* show only selected polygon name in upper-left */}
          {selectedLabel && <text x={10} y={20} className="map-selected-label">{selectedLabel}</text>}
        </svg>
        <PolygonHoverTooltip x={hover.x} y={hover.y} label={hover.label} visible={hover.visible} />
      </div>
      {statusById && (
        <div className="legend map-legend" aria-label="Map key">
          <span className="l-free">Free all day</span>
          <span className="l-busy">Some hours taken</span>
          <span className="l-asg">Assigned seat</span>
          <span className="l-mine">Reserved by you</span>
          <span className="l-sel2">Selected</span>
        </div>
      )}
    </div>
  );
}
