import React from 'react';

export default function KpiCard({ title, value, subtext, icon: Icon, badge, color = 'var(--accent-cyan)' }) {
  return (
    <div className="kpi-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="kpi-label">
          {Icon && <Icon size={16} color={color} />}
          <span>{title}</span>
        </div>
        {badge && (
          <span style={{
            fontSize: '0.7rem',
            padding: '2px 8px',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.08)',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)'
          }}>
            {badge}
          </span>
        )}
      </div>
      <div className="kpi-value" style={{ color: color !== 'var(--accent-cyan)' ? color : '#ffffff' }}>
        {value !== undefined && value !== null ? value : '—'}
      </div>
      {subtext && <div className="kpi-subtext">{subtext}</div>}
    </div>
  );
}
