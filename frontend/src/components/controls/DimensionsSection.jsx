import { useShedStore } from '../../store/shedStore';
import {
  CATALOG_WIDTHS,
  CATALOG_PEAK_HEIGHT,
  getAvailableTiers,
  getAvailableLengths,
} from '../../utils/pricingUtils';

const TIER_STYLE = {
  Standard: { background: 'rgba(30,58,138,0.5)',  color: '#93c5fd' },
  Deluxe:   { background: 'rgba(88,28,135,0.5)',  color: '#d8b4fe' },
  Special:  { background: 'rgba(120,53,15,0.5)',  color: '#fbbf24' },
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

const LABEL = {
  display: 'block',
  color: '#94a3b8',
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: 6,
};

export const DimensionsSection = () => {
  const width      = useShedStore((s) => s.width);
  const length     = useShedStore((s) => s.length);
  const tier       = useShedStore((s) => s.tier);
  const setWidth      = useShedStore((s) => s.setWidth);
  const setLength     = useShedStore((s) => s.setLength);
  const setTier       = useShedStore((s) => s.setTier);

  const availableTiers   = getAvailableTiers(width);
  const availableLengths = getAvailableLengths(width, tier);
  const tierStyle = TIER_STYLE[tier] ?? TIER_STYLE.Standard;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label style={LABEL}>Width</label>
        <select style={SELECT} value={width} onChange={(e) => setWidth(parseInt(e.target.value, 10))}>
          {CATALOG_WIDTHS.map((w) => (
            <option key={w} value={w}>{w} ft</option>
          ))}
        </select>
      </div>

      <div>
        <label style={LABEL}>Length</label>
        <select style={SELECT} value={length} onChange={(e) => setLength(parseInt(e.target.value, 10))}>
          {availableLengths.map((l) => (
            <option key={l} value={l}>{l} ft</option>
          ))}
        </select>
      </div>

      <div>
        <label style={LABEL}>Build</label>
        <select style={SELECT} value={tier} onChange={(e) => setTier(e.target.value)}>
          {availableTiers.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Summary chip */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(30,58,138,0.2)',
        border: '1px solid rgba(59,130,246,0.25)',
        borderRadius: 8,
        padding: '8px 12px',
        marginTop: 2,
      }}>
        <span style={{ color: '#93c5fd', fontSize: 12 }}>
          {width} × {length} × {CATALOG_PEAK_HEIGHT} ft &nbsp;·&nbsp; {width * length} sq ft
        </span>
        <span style={{
          padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
          ...tierStyle,
        }}>
          {tier}
        </span>
      </div>
    </div>
  );
};
