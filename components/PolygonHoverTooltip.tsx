import React from 'react';

export default function PolygonHoverTooltip({ x, y, label, visible }: { x: number; y: number; label?: string; visible?: boolean }) {
  if (!visible || !label) return null;
  const style: React.CSSProperties = {
    position: 'absolute',
    left: x + 8,
    top: y + 8,
    background: 'rgba(15,23,42,0.9)',
    color: '#fff',
    padding: '6px 10px',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 500,
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    pointerEvents: 'none',
    zIndex: 1000,
    whiteSpace: 'nowrap'
  };
  return <div style={style}>{label}</div>;
}
