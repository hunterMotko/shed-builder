import { useId } from 'react';
import { useShedStore } from '../../store/shedStore';
import { getEffectiveTrimColor } from '../../utils/advancedColorUtils';

const LABEL = {
  display: 'block',
  color: '#94a3b8',
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: 8,
};

const SELECT = {
  width: '100%',
  background: '#334155',
  color: '#e2e8f0',
  border: '1px solid #475569',
  borderRadius: 6,
  padding: '8px 10px',
  fontSize: 13,
  outline: 'none',
  cursor: 'pointer',
};

const PillToggle = ({ value, onChange, options }) => (
  <div style={{
    display: 'flex',
    background: '#0f172a',
    borderRadius: 8,
    padding: 3,
    gap: 2,
  }}>
    {options.map((opt) => (
      <button
        key={opt.value}
        onClick={() => onChange(opt.value)}
        style={{
          flex: 1,
          padding: '6px 0',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: value === opt.value ? 600 : 400,
          color: value === opt.value ? '#f1f5f9' : '#64748b',
          background: value === opt.value ? '#3b82f6' : 'transparent',
          transition: 'background 150ms, color 150ms',
        }}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

export const TrimAndDetailsSection = () => {
  // Bind each styled <label> to the control it names (issue #21).
  const id = useId();
  const {
    color: wallColor,
    roofColor,
    trimColor,
    trimColorMode,
    trimAutoMode,
    sidingTexture,
    roofMaterial,
    setTrimColor,
    setTrimColorMode,
    setTrimAutoMode,
    setSidingTexture,
    setRoofMaterial,
  } = useShedStore();

  const effectiveTrimColor = getEffectiveTrimColor(
    trimColor, trimColorMode, wallColor, roofColor, trimAutoMode
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Siding Texture */}
      <div>
        <label style={LABEL} htmlFor={`${id}-siding`}>Siding Texture</label>
        <select id={`${id}-siding`} style={SELECT} value={sidingTexture} onChange={(e) => setSidingTexture(e.target.value)}>
          <option value="T1-11">T1-11 Plywood (Ribbed)</option>
          <option value="smooth">Smooth Board</option>
        </select>
      </div>

      {/* Roof Material */}
      <div>
        <label style={LABEL} htmlFor={`${id}-roof-material`}>Roof Material</label>
        <select id={`${id}-roof-material`} style={SELECT} value={roofMaterial} onChange={(e) => setRoofMaterial(e.target.value)}>
          <option value="metal">Metal (Corrugated)</option>
          <option value="shingle">Asphalt Shingle</option>
        </select>
      </div>

      {/* Trim Color Mode */}
      <div>
        <label style={LABEL}>Trim Color</label>
        <PillToggle
          value={trimColorMode}
          onChange={setTrimColorMode}
          options={[
            { value: 'automatic', label: 'Auto' },
            { value: 'manual',    label: 'Manual' },
          ]}
        />

        {/* Auto sub-option */}
        {trimColorMode === 'automatic' && (
          <div style={{ marginTop: 10 }}>
            <select
              aria-label="Automatic trim color rule"
              style={SELECT}
              value={trimAutoMode} onChange={(e) => setTrimAutoMode(e.target.value)}>
              <option value="matchRoof">Match Roof Color</option>
              <option value="contrast">Maximum Contrast</option>
            </select>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 4,
                background: effectiveTrimColor,
                border: '1px solid #475569',
                flexShrink: 0,
              }} />
              <span style={{ color: '#64748b', fontSize: 11 }}>Current trim color</span>
            </div>
          </div>
        )}

        {/* Manual color picker */}
        {trimColorMode === 'manual' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
            <input
              type="color"
              value={trimColor}
              onChange={(e) => setTrimColor(e.target.value)}
              style={{ width: 40, height: 32, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
            />
            <div style={{
              width: 28, height: 28, borderRadius: 4,
              background: trimColor,
              border: '1px solid #475569',
            }} />
            <span style={{ color: '#64748b', fontSize: 11 }}>{trimColor}</span>
          </div>
        )}
      </div>
    </div>
  );
};
