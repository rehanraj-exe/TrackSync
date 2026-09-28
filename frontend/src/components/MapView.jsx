import React, { useState, useEffect } from 'react';
import { AlertTriangle, Shield, Activity, MapPin, ChevronRight } from 'lucide-react';

// Approximate positions for Indian railway sections on a simplified SVG map
const SECTIONS = [
  { id: 'BCT-NGP', name: 'Mumbai – Nagpur', startCity: 'Mumbai', endCity: 'Nagpur', x1: 150, y1: 340, x2: 290, y2: 260, distance: '835 km' },
  { id: 'NGP-HWH', name: 'Nagpur – Howrah', startCity: 'Nagpur', endCity: 'Howrah', x1: 290, y1: 260, x2: 480, y2: 230, distance: '1120 km' },
  { id: 'HWH-MAS', name: 'Howrah – Chennai', startCity: 'Howrah', endCity: 'Chennai', x1: 480, y1: 230, x2: 340, y2: 430, distance: '1660 km' },
  { id: 'MAS-LKO', name: 'Chennai – Lucknow', startCity: 'Chennai', endCity: 'Lucknow', x1: 340, y1: 430, x2: 310, y2: 160, distance: '1930 km' },
  { id: 'LKO-NDLS', name: 'Lucknow – New Delhi', startCity: 'Lucknow', endCity: 'New Delhi', x1: 310, y1: 160, x2: 230, y2: 120, distance: '510 km' },
];

const CITIES = [
  { name: 'Mumbai', code: 'BCT', x: 150, y: 340 },
  { name: 'Nagpur', code: 'NGP', x: 290, y: 260 },
  { name: 'Howrah', code: 'HWH', x: 480, y: 230 },
  { name: 'Chennai', code: 'MAS', x: 340, y: 430 },
  { name: 'Lucknow', code: 'LKO', x: 310, y: 160 },
  { name: 'New Delhi', code: 'NDLS', x: 230, y: 120 },
];

function getRiskLevel(section, data) {
  if (!data || !data.recommendations) return { level: 'low', score: 0, color: '#10b981', tasks: 0, departments: [] };
  const rec = data.recommendations.find(r => r.section === section.id);
  if (!rec) return { level: 'low', score: 0, color: '#10b981', tasks: 0, departments: [] };

  const score = rec.priority_score || 0;
  if (score >= 8) return { level: 'critical', score, color: '#ff0055', tasks: rec.task_ids?.length || 0, departments: rec.departments || [], delay: rec.train_delay_minutes };
  if (score >= 6) return { level: 'high', score, color: '#f59e0b', tasks: rec.task_ids?.length || 0, departments: rec.departments || [], delay: rec.train_delay_minutes };
  if (score >= 4) return { level: 'medium', score, color: '#3b82f6', tasks: rec.task_ids?.length || 0, departments: rec.departments || [], delay: rec.train_delay_minutes };
  return { level: 'low', score, color: '#10b981', tasks: rec.task_ids?.length || 0, departments: rec.departments || [], delay: rec.train_delay_minutes };
}

export default function MapView({ data, mapFocus }) {
  const [selectedSection, setSelectedSection] = useState(null);
  const [hoveredSection, setHoveredSection] = useState(null);

  useEffect(() => {
    if (mapFocus) {
      const section = SECTIONS.find(s => s.id === mapFocus);
      if (section) setSelectedSection(section);
    }
  }, [mapFocus]);

  const activeSection = selectedSection || (hoveredSection ? SECTIONS.find(s => s.id === hoveredSection) : null);
  const activeRisk = activeSection ? getRiskLevel(activeSection, data) : null;

  return (
    <div style={{ display: 'flex', gap: '1.5rem', height: '100%' }}>

      {/* Map Canvas */}
      <div className="glass-panel" style={{ flex: 1, position: 'relative', overflow: 'hidden', borderRadius: '16px' }}>

        {/* Title overlay */}
        <div style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', zIndex: 5 }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>Network Risk Map</h2>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Click a section to view maintenance status and risk assessment
          </p>
        </div>

        {/* Legend */}
        <div style={{ position: 'absolute', bottom: '1.5rem', left: '1.5rem', zIndex: 5, display: 'flex', gap: '1rem', fontSize: '0.75rem' }}>
          {[
            { label: 'Critical', color: '#ff0055' },
            { label: 'High', color: '#f59e0b' },
            { label: 'Medium', color: '#3b82f6' },
            { label: 'Low', color: '#10b981' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.color, boxShadow: `0 0 8px ${item.color}60` }}></div>
              {item.label}
            </div>
          ))}
        </div>

        {/* SVG Map */}
        <svg viewBox="0 0 640 520" style={{ width: '100%', height: '100%' }} xmlns="http://www.w3.org/2000/svg">
          <defs>
            {/* Glow filter for lines */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="glow-strong">
              <feGaussianBlur stdDeviation="8" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Grid pattern */}
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
            </pattern>
          </defs>

          {/* Background grid */}
          <rect width="640" height="520" fill="url(#grid)" />

          {/* India outline — simplified abstract shape */}
          <path
            d="M 180 80 Q 140 100 120 160 Q 100 220 110 280 Q 120 320 130 350 Q 140 380 160 400 Q 200 440 240 460 Q 280 480 320 470 Q 360 460 380 440 Q 400 420 420 380 Q 440 340 460 300 Q 500 250 520 230 Q 540 210 530 180 Q 520 150 490 130 Q 460 110 420 100 Q 380 90 340 85 Q 300 80 260 78 Q 220 76 180 80 Z"
            fill="rgba(255,255,255,0.02)"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />

          {/* Railway route lines */}
          {SECTIONS.map(section => {
            const risk = getRiskLevel(section, data);
            const isActive = activeSection?.id === section.id;
            const isHovered = hoveredSection === section.id;
            return (
              <g key={section.id}>
                {/* Shadow line */}
                <line
                  x1={section.x1} y1={section.y1}
                  x2={section.x2} y2={section.y2}
                  stroke={risk.color}
                  strokeWidth={isActive ? 6 : isHovered ? 5 : 3}
                  strokeOpacity={0.3}
                  filter="url(#glow-strong)"
                />
                {/* Main line */}
                <line
                  x1={section.x1} y1={section.y1}
                  x2={section.x2} y2={section.y2}
                  stroke={risk.color}
                  strokeWidth={isActive ? 4 : isHovered ? 3 : 2}
                  strokeLinecap="round"
                  filter="url(#glow)"
                  style={{ cursor: 'pointer', transition: 'all 0.3s' }}
                  onClick={() => setSelectedSection(section)}
                  onMouseEnter={() => setHoveredSection(section.id)}
                  onMouseLeave={() => setHoveredSection(null)}
                />
                {/* Section label at midpoint */}
                <text
                  x={(section.x1 + section.x2) / 2}
                  y={(section.y1 + section.y2) / 2 - 12}
                  textAnchor="middle"
                  fill={isActive || isHovered ? 'white' : 'rgba(255,255,255,0.5)'}
                  fontSize="11"
                  fontWeight={isActive ? '700' : '500'}
                  style={{ transition: 'all 0.3s', pointerEvents: 'none' }}
                >
                  {section.id}
                </text>
                {/* Pulsing dot for critical sections */}
                {risk.level === 'critical' && (
                  <circle
                    cx={(section.x1 + section.x2) / 2}
                    cy={(section.y1 + section.y2) / 2}
                    r="6"
                    fill={risk.color}
                    opacity="0.8"
                  >
                    <animate attributeName="r" values="4;10;4" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.8;0.2;0.8" dur="2s" repeatCount="indefinite" />
                  </circle>
                )}
              </g>
            );
          })}

          {/* Station nodes */}
          {CITIES.map(city => {
            const isActive = activeSection && (activeSection.startCity === city.name || activeSection.endCity === city.name);
            return (
              <g key={city.code}>
                {/* Outer ring */}
                <circle
                  cx={city.x} cy={city.y} r={isActive ? 10 : 7}
                  fill="none"
                  stroke={isActive ? 'var(--accent-purple-light)' : 'rgba(255,255,255,0.3)'}
                  strokeWidth="1.5"
                  style={{ transition: 'all 0.3s' }}
                />
                {/* Inner dot */}
                <circle
                  cx={city.x} cy={city.y} r={isActive ? 5 : 3}
                  fill={isActive ? 'white' : 'rgba(255,255,255,0.6)'}
                  style={{ transition: 'all 0.3s' }}
                />
                {/* City label */}
                <text
                  x={city.x}
                  y={city.y + (city.name === 'Delhi' || city.name === 'Lucknow' ? -16 : 22)}
                  textAnchor="middle"
                  fill={isActive ? 'white' : 'rgba(255,255,255,0.6)'}
                  fontSize="12"
                  fontWeight={isActive ? '600' : '400'}
                  style={{ transition: 'all 0.3s' }}
                >
                  {city.name} ({city.code})
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Detail Side Panel */}
      <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {/* Section Detail */}
        <div className="glass-panel" style={{ padding: '1.5rem', flex: 1 }}>
          {activeSection ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '12px',
                  background: `linear-gradient(135deg, ${activeRisk.color}40, ${activeRisk.color}20)`,
                  border: `1px solid ${activeRisk.color}60`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {activeRisk.level === 'critical' ? <AlertTriangle size={20} color={activeRisk.color} /> : <Shield size={20} color={activeRisk.color} />}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.125rem', color: 'white' }}>Section {activeSection.id}</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{activeSection.name}</p>
                </div>
              </div>

              {/* Risk Badge */}
              <div style={{
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                background: `${activeRisk.color}15`,
                border: `1px solid ${activeRisk.color}30`,
                marginBottom: '1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Risk Level</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: activeRisk.color, textTransform: 'uppercase' }}>{activeRisk.level}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Priority Score</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>{activeRisk.score.toFixed(1)}</div>
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Tasks</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white' }}>{activeRisk.tasks}</div>
                </div>
                <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Delay Impact</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white' }}>{activeRisk.delay?.toFixed(1) || '0'}m</div>
                </div>
                <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Distance</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white' }}>{activeSection.distance}</div>
                </div>
                <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Departments</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white' }}>{activeRisk.departments?.length || 0}</div>
                </div>
              </div>

              {/* Departments */}
              {activeRisk.departments && activeRisk.departments.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Assigned Departments</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {activeRisk.departments.map(dept => (
                      <div key={dept} style={{
                        padding: '0.5rem 0.75rem',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <ChevronRight size={12} color="var(--accent-purple-light)" />
                        {dept}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem', color: 'var(--text-muted)' }}>
              <MapPin size={40} strokeWidth={1.5} />
              <div style={{ fontSize: '0.875rem', textAlign: 'center' }}>
                Select a railway section on the map to view risk details
              </div>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Activity size={16} color="var(--accent-purple-light)" />
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'white' }}>Network Summary</span>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {['critical', 'high', 'medium', 'low'].map(level => {
              const count = SECTIONS.filter(s => getRiskLevel(s, data).level === level).length;
              const colors = { critical: '#ff0055', high: '#f59e0b', medium: '#3b82f6', low: '#10b981' };
              return (
                <div key={level} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{
                    fontSize: '1.25rem', fontWeight: 700, color: colors[level],
                    textShadow: `0 0 10px ${colors[level]}40`
                  }}>
                    {count}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{level}</div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
