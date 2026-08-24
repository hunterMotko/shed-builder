const LABEL = {
  display: 'block',
  color: '#94a3b8',
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: 10,
};

// Simple inline SVG roof silhouettes
const GableSVG = () => (
  <svg width="52" height="32" viewBox="0 0 52 32" fill="none" aria-hidden="true">
    <rect x="2" y="18" width="48" height="12" fill="#475569" rx="1" />
    <path d="M2 18 L26 4 L50 18 Z" fill="#64748b" />
  </svg>
);

const BarnSVG = () => (
  <svg width="52" height="36" viewBox="0 0 52 36" fill="none" aria-hidden="true">
    <rect x="2" y="22" width="48" height="12" fill="#475569" rx="1" />
    {/* Lower steep slopes */}
    <path d="M2 22 L14 12 L38 12 L50 22 Z" fill="#64748b" />
    {/* Upper gentle slopes */}
    <path d="M14 12 L26 4 L38 12 Z" fill="#94a3b8" />
  </svg>
);

const MODELS = [
  { value: 'Gable', label: 'Gable',        desc: 'Classic peaked roof',  Icon: GableSVG },
  { value: 'Barn',  label: 'Barn (Gambrel)', desc: 'Double-slope barn roof', Icon: BarnSVG  },
];

export const ModelSection = ({ model, onModelChange }) => (
  <div>
    <label style={LABEL}>Model</label>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      {MODELS.map(({ value, label, desc, Icon }) => {
        const active = model === value;
        return (
          <button
            key={value}
            role="radio"
            aria-checked={active}
            onClick={() => onModelChange(value)}
            style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 6,
              padding: '12px 8px',
              border: `2px solid ${active ? '#3b82f6' : '#475569'}`,
              borderRadius: 8,
              background: active ? 'rgba(59,130,246,0.12)' : '#2d3f53',
              cursor: 'pointer',
              transition: 'border-color 150ms, background 150ms',
            }}
          >
            <Icon />
            <span style={{ color: active ? '#93c5fd' : '#cbd5e1', fontSize: 12, fontWeight: 600 }}>
              {label}
            </span>
            <span style={{ color: '#64748b', fontSize: 10 }}>{desc}</span>
          </button>
        );
      })}
    </div>
  </div>
);
