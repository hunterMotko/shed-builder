import { useState } from 'react';
import { useShedStore } from '../../store/shedStore';
import { OPTION_PRICES } from '../../utils/pricingUtils';

// ── Primitives ────────────────────────────────────────────────────────────────

// `requires` names what an Option needs before it can be bought — a pair of
// shutters needs a window to flank, a ramp needs a garage door to meet. It
// greys the row and says why, rather than letting a customer buy geometry that
// cannot be built (issue #44).
const Checkbox = ({ checked, onChange, label, price, children, requires = null }) => (
  <label
    style={{
      display: 'flex', alignItems: 'flex-start', gap: 10, padding: '7px 0',
      cursor: requires ? 'not-allowed' : 'pointer', opacity: requires ? 0.5 : 1,
    }}
  >
    <input
      type="checkbox"
      checked={checked}
      disabled={Boolean(requires)}
      onChange={(e) => onChange(e.target.checked)}
      style={{ marginTop: 2, width: 14, height: 14, accentColor: '#3b82f6', cursor: requires ? 'not-allowed' : 'pointer', flexShrink: 0 }}
    />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#e2e8f0', fontSize: 13 }}>{label}</span>
        <span style={{
          fontSize: 12, fontWeight: 600, marginLeft: 8, flexShrink: 0,
          color: checked ? '#4ade80' : '#475569',
        }}>
          +${price.toLocaleString()}
        </span>
      </div>
      {requires && (
        <div style={{ marginTop: 4, fontSize: 11, color: '#94a3b8' }}>{requires}</div>
      )}
      {children && !requires && <div style={{ marginTop: 6 }}>{children}</div>}
    </div>
  </label>
);

// A Checkbox wraps its children in the <label> that names the checkbox, so a
// <select> nested inside inherits nothing — the label is already spoken for.
// Each sub-control names itself (issue #21).
const SUB_SELECT = {
  background: '#1e293b',
  color: '#cbd5e1',
  border: '1px solid #475569',
  borderRadius: 5,
  padding: '4px 8px',
  fontSize: 12,
  outline: 'none',
  cursor: 'pointer',
};

// Collapsible group
function AccordionGroup({ title, selectedCount, children }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ borderBottom: '1px solid #334155' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '11px 0', background: 'none', border: 'none', cursor: 'pointer',
        }}
      >
        <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {title}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {selectedCount > 0 && (
            <span style={{
              background: '#1d4ed8', color: '#bfdbfe',
              borderRadius: 10, padding: '1px 7px', fontSize: 10, fontWeight: 600,
            }}>
              {selectedCount}
            </span>
          )}
          <svg
            width="12" height="12" viewBox="0 0 12 12" fill="none"
            style={{
              color: '#64748b',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 200ms ease',
            }}
          >
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>

      <div style={{
        overflow: 'hidden',
        maxHeight: open ? 600 : 0,
        opacity: open ? 1 : 0,
        transition: 'max-height 220ms ease, opacity 160ms ease',
      }}>
        <div style={{ paddingBottom: 6 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export const OptionsSection = () => {
  const options  = useShedStore((s) => s.options);
  const setOption = useShedStore((s) => s.setOption);
  const set = (key, cfg) => setOption(key, cfg);

  // An octagon is bought per gable end, so both the window and the vent need
  // the same choice of ends (issue #43). The <select> names itself: `Checkbox`
  // wraps its children in the <label> that names the checkbox, so a control
  // nested inside inherits no name of its own (issue #21).
  const endsSelect = (key, name) => (
    <select
      aria-label={`${name} — which gable ends`}
      style={SUB_SELECT}
      value={options[key].ends ?? 'front'}
      onChange={(e) => set(key, { ends: e.target.value })}
    >
      <option value="front">Front gable</option>
      <option value="back">Back gable</option>
      <option value="both">Both gables</option>
    </select>
  );

  /** What an octagon Option costs: one price per end fitted. */
  const octagonPrice = (key, unit) =>
    unit * (options[key].ends === 'both' ? 2 : 1);

  const windowsCount = [options.octagonWindow, options.skylight, options.octagonVent].filter((o) => o.enabled).length;
  const intCount     = [options.workbench, options.pegboard, options.loft].filter((o) => o?.enabled).length;

  return (
    <div>
      {/* Doors, windows, shutters and ramps are not here: they are placed on
          the shed, and the Openings list is where they are managed. An Option
          is a catalog item with a price; a Placement is a position on a named
          wall, and pricing a door twice is how a Quote stops being one. */}
      {/* Windows & Light */}
      <AccordionGroup title="Windows & Light" selectedCount={windowsCount}>
        <Checkbox
          checked={options.octagonWindow.enabled}
          onChange={(v) => set('octagonWindow', { enabled: v })}
          label="Octagon Gable Window"
          price={octagonPrice('octagonWindow', OPTION_PRICES.window_octagon)}
        >
          {options.octagonWindow.enabled && endsSelect('octagonWindow', 'Octagon gable window')}
        </Checkbox>

        <Checkbox
          checked={options.skylight.enabled}
          onChange={(v) => set('skylight', { enabled: v })}
          label="Ridge Skylight"
          price={OPTION_PRICES.skylight_per_ft * (options.skylight.runningFt || 0)}
        >
          {options.skylight.enabled && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="range" min="4" max="20" step="2"
                aria-label="Ridge skylight length in feet"
                value={options.skylight.runningFt}
                onChange={(e) => set('skylight', { runningFt: parseInt(e.target.value, 10) })}
                style={{ flex: 1, accentColor: '#3b82f6' }}
              />
              <span style={{ color: '#94a3b8', fontSize: 11, width: 28, textAlign: 'right' }}>
                {options.skylight.runningFt} ft
              </span>
            </div>
          )}
        </Checkbox>

        <Checkbox
          checked={options.octagonVent.enabled}
          onChange={(v) => set('octagonVent', { enabled: v })}
          label="Vinyl Octagon Gable Vent"
          price={octagonPrice('octagonVent', OPTION_PRICES.vent_octagon)}
        >
          {options.octagonVent.enabled && endsSelect('octagonVent', 'Octagon gable vent')}
        </Checkbox>
      </AccordionGroup>

      {/* Interior */}
      <AccordionGroup title="Interior" selectedCount={intCount}>
        <Checkbox
          checked={Boolean(options.workbench?.enabled)}
          onChange={(v) => set('workbench', { enabled: v })}
          label="Workbench"
          price={OPTION_PRICES.workbench_per_ft * (options.workbench?.runningFt || 0)}
        >
          {options.workbench?.enabled && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="range" min="2" max="24" step="2"
                aria-label="Workbench length in running feet"
                value={options.workbench.runningFt}
                onChange={(e) => set('workbench', { runningFt: parseInt(e.target.value, 10) })}
                style={{ flex: 1, accentColor: '#3b82f6' }}
              />
              <span style={{ color: '#94a3b8', fontSize: 11, width: 28, textAlign: 'right' }}>
                {options.workbench.runningFt} ft
              </span>
            </div>
          )}
        </Checkbox>

        <Checkbox
          checked={Boolean(options.pegboard?.enabled)}
          onChange={(v) => set('pegboard', { enabled: v })}
          label="Pegboard"
          price={OPTION_PRICES.pegboard_per_sheet * (options.pegboard?.sheets || 0)}
        >
          {options.pegboard?.enabled && (
            <select
              aria-label="Number of pegboard sheets"
              style={SUB_SELECT}
              value={options.pegboard.sheets}
              onChange={(e) => set('pegboard', { sheets: parseInt(e.target.value, 10) })}
            >
              {[1,2,3,4,5,6].map((n) => (
                <option key={n} value={n}>{n} sheet{n > 1 ? 's' : ''} (4×8) — ${(OPTION_PRICES.pegboard_per_sheet * n).toLocaleString()}</option>
              ))}
            </select>
          )}
        </Checkbox>

        {/* Footage *added*. A Barn is built with a half loft already, and this
            buys more on top of it; a Gable is built with none, so its first
            loft is all of this. */}
        <Checkbox
          checked={Boolean(options.loft?.enabled)}
          onChange={(v) => set('loft', { enabled: v })}
          label="Loft / Shelving"
          price={OPTION_PRICES.loft_per_sqft * (options.loft?.sqft || 0)}
        >
          {options.loft?.enabled && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="range" min="16" max="320" step="16"
                  aria-label="Loft and shelving area added, in square feet"
                  value={options.loft.sqft}
                  onChange={(e) => set('loft', { sqft: parseInt(e.target.value, 10) })}
                  style={{ flex: 1, accentColor: '#3b82f6' }}
                />
                <span style={{ color: '#94a3b8', fontSize: 11, width: 44, textAlign: 'right' }}>
                  {options.loft.sqft} sq ft
                </span>
              </div>
              <div style={{ marginTop: 4, fontSize: 11, color: '#94a3b8' }}>
                Square feet added. A barn is built with a half loft already.
              </div>
            </div>
          )}
        </Checkbox>
      </AccordionGroup>
    </div>
  );
};
