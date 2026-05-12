import React from 'react';

type DrawerColor = 'teal' | 'purple' | 'amber' | 'sky' | 'green' | 'rose' | 'slate';

interface DrawerColorConfig {
  bg: string;
  border: string;
  text: string;
}

const DRAWER_COLORS: Record<DrawerColor, DrawerColorConfig> = {
  teal: { bg: 'rgba(20,184,166,0.08)', border: '#14B8A6', text: '#0f766e' },
  purple: { bg: 'rgba(168,85,247,0.08)', border: '#A855F7', text: '#7c3aed' },
  amber: { bg: 'rgba(245,158,11,0.08)', border: '#F59E0B', text: '#b45309' },
  sky: { bg: 'rgba(56,189,248,0.08)', border: '#38BDF8', text: '#0284c7' },
  green: { bg: 'rgba(34,197,94,0.08)', border: '#22C55E', text: '#15803d' },
  rose: { bg: 'rgba(244,63,94,0.08)', border: '#F43F5E', text: '#be123c' },
  slate: { bg: 'rgba(99,102,241,0.07)', border: 'var(--violet)', text: 'var(--violet)' },
};

export interface DrawerPanelProps {
  title: string;
  color?: DrawerColor | string;
  onClose: () => void;
  children: React.ReactNode;
}

export default function DrawerPanel({ title, color, onClose, children }: DrawerPanelProps) {
  const dc = DRAWER_COLORS[color as DrawerColor] || DRAWER_COLORS.slate;

  return (
    <div className="tu-drawer" style={{ borderColor: dc.border }}>
      <div className="tu-drawer-header" style={{ background: dc.bg, borderBottomColor: dc.border }}>
        <span className="tu-drawer-title" style={{ color: dc.text }}>
          {title}
        </span>
        <button className="tu-drawer-close" onClick={onClose} title="Close">
          ✕
        </button>
      </div>
      <div className="tu-drawer-body">{children}</div>
    </div>
  );
}
