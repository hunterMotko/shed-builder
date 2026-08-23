import { useState } from 'react';

const SIDING_COLORS = [
  { name: 'Saddle Brown',  hex: '#8B4513' },
  { name: 'Barn Red',      hex: '#D2691E' },
  { name: 'Forest Green',  hex: '#228B22' },
  { name: 'Dark Gray',     hex: '#505050' },
  { name: 'Light Gray',    hex: '#A9A9A9' },
  { name: 'White',         hex: '#FFFFFF' },
  { name: 'Black',         hex: '#000000' },
  { name: 'Tan',           hex: '#D2B48C' },
  { name: 'Deep Red',      hex: '#8B0000' },
  { name: 'Navy Blue',     hex: '#000080' },
];

const ROOF_COLORS = [
  { name: 'Dark Teal',      hex: '#2F4F4F' },
  { name: 'Black',          hex: '#1C1C1C' },
  { name: 'Charcoal',       hex: '#36454F' },
  { name: 'Slate Gray',     hex: '#708090' },
  { name: 'Rustic Red',     hex: '#8B3A3A' },
  { name: 'Dark Brown',     hex: '#654321' },
  { name: 'Forest Green',   hex: '#1F4F1F' },
  { name: 'Weathered Gray', hex: '#808080' },
  { name: 'Deep Bronze',    hex: '#6F5D3F' },
  { name: 'Dark Burgundy',  hex: '#722F37' },
];

const LABEL = {
  display: 'block',
  color: '#94a3b8',
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: 10,
};

export const ColorSection = ({ label, currentColor, onColorChange, colorType }) => {
  const [showCustom, setShowCustom] = useState(false);
  const colors = colorType === 'siding' ? SIDING_COLORS : ROOF_COLORS;
  const selectedName = colors.find((c) => c.hex === currentColor)?.name;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={LABEL}>{label}</span>
        {selectedName && (
          <span style={{ color: '#64748b', fontSize: 11 }}>{selectedName}</span>
        )}
      </div>

      {/* Swatch grid — always visible */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
        {colors.map((c) => {
          const active = currentColor === c.hex;
          return (
            <button
              key={c.hex}
              onClick={() => onColorChange(c.hex)}
              title={c.name}
              aria-label={c.name}
              aria-pressed={active}
              style={{
                aspectRatio: '1',
                borderRadius: 6,
                border: `2px solid ${active ? '#3b82f6' : 'transparent'}`,
                outline: active ? '2px solid #1e3a8a' : 'none',
                outlineOffset: 1,
                background: c.hex,
                cursor: 'pointer',
                boxShadow: active ? '0 0 0 1px #3b82f6' : 'none',
                transition: 'transform 100ms, box-shadow 100ms',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.12)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            />
          );
        })}
      </div>

      {/* Custom color option */}
      <div style={{ marginTop: 8 }}>
        {!showCustom ? (
          <button
            onClick={() => setShowCustom(true)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#475569', fontSize: 11,
              textDecoration: 'underline', padding: 0,
              transition: 'color 120ms',
            }}
            onMouseEnter={(e) => e.target.style.color = '#94a3b8'}
            onMouseLeave={(e) => e.target.style.color = '#475569'}
          >
            Custom color…
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="color"
              value={currentColor}
              onChange={(e) => onColorChange(e.target.value)}
              style={{ width: 36, height: 28, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
            />
            <span style={{ color: '#94a3b8', fontSize: 11 }}>{currentColor}</span>
            <button
              onClick={() => setShowCustom(false)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#475569', fontSize: 11, padding: 0,
              }}
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
