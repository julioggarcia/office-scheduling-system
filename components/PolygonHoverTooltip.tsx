import React from 'react';

export default function PolygonHoverTooltip({ x, y, label, visible }: { x: number; y: number; label?: string; visible?: boolean }) {
  if (!visible || !label) return null;
  const style: React.CSSProperties = {
    position: 'absolute',
    left: x + 8,
    top: y + 8,
    background: 'rgba(0,0,0,0.75)',
    color: '#fff',
    padding: '6px 8px',
    borderRadius: 4,
    fontSize: 12,
    pointerEvents: 'none',
    zIndex: 1000,
    whiteSpace: 'nowrap'
  };
  return <div style={style}>{label}</div>;
}
