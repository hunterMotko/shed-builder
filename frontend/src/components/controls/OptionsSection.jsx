import { useState } from 'react';
import { useShedStore } from '../../store/shedStore';
import { OPTION_PRICES } from '../../utils/pricingUtils';

// ── Primitives ────────────────────────────────────────────────────────────────

const Checkbox = ({ checked, onChange, label, price, children }) => (
  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '7px 0', cursor: 'pointer' }}>
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      style={{ marginTop: 2, width: 14, height: 14, accentColor: '#3b82f6', cursor: 'pointer', flexShrink: 0 }}
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
      {children && <div style={{ marginTop: 6 }}>{children}</div>}
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

  const doorsCount   = [options.garageDoor, options.additionalDoor, options.entryDoor].filter((o) => o.enabled).length;
  const windowsCount = [options.vinylWindows, options.octagonWindow, options.skylight, options.octagonVent].filter((o) => o.enabled).length;
  const extCount     = [options.shutters, options.ramp].filter((o) => o.enabled).length;

  return (
    <div>
      {/* Doors & Entry */}
      <AccordionGroup title="Doors & Entry" selectedCount={doorsCount}>
        <Checkbox
          checked={options.garageDoor.enabled}
          onChange={(v) => set('garageDoor', { enabled: v })}
          label="Roll-Up Garage Door"
          price={options.garageDoor.size === '8x7' ? OPTION_PRICES.garage_door_8x7 : OPTION_PRICES.garage_door_6x7}
        >
          {options.garageDoor.enabled && (
            <select aria-label="Roll-up garage door size" style={SUB_SELECT} value={options.garageDoor.size} onChange={(e) => set('garageDoor', { size: e.target.value })}>
              <option value="6x7">6×7 — $450</option>
              <option value="8x7">8×7 — $500</option>
            </select>
          )}
        </Checkbox>

        <Checkbox
          checked={options.additionalDoor.enabled}
          onChange={(v) => set('additionalDoor', { enabled: v })}
          label="Additional Garage Door"
          price={OPTION_PRICES.garage_door_additional}
        />

        <Checkbox
          checked={options.entryDoor.enabled}
          onChange={(v) => set('entryDoor', { enabled: v })}
          label="36in Pre-Hung Entry Door"
          price={options.entryDoor.type === 'nine_light' ? OPTION_PRICES.entry_door_nine_light : OPTION_PRICES.entry_door_steel}
        >
          {options.entryDoor.enabled && (
            <select aria-label="Entry door type" style={SUB_SELECT} value={options.entryDoor.type} onChange={(e) => set('entryDoor', { type: e.target.value })}>
              <option value="steel">Steel Panel — $375</option>
              <option value="nine_light">Nine-Light — $425</option>
            </select>
          )}
        </Checkbox>
      </AccordionGroup>

      {/* Windows & Light */}
      <AccordionGroup title="Windows & Light" selectedCount={windowsCount}>
        <Checkbox
          checked={options.vinylWindows.enabled}
          onChange={(v) => set('vinylWindows', { enabled: v })}
          label="Vinyl Slide Windows"
          price={OPTION_PRICES.window_vinyl_slide * (options.vinylWindows.count || 1)}
        >
          {options.vinylWindows.enabled && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select aria-label="Number of vinyl slide windows" style={SUB_SELECT} value={options.vinylWindows.count} onChange={(e) => set('vinylWindows', { count: parseInt(e.target.value, 10) })}>
                {[1,2,3,4,5,6].map((n) => (
                  <option key={n} value={n}>{n} window{n > 1 ? 's' : ''}</option>
                ))}
              </select>
              <select aria-label="Vinyl slide window size" style={SUB_SELECT} value={options.vinylWindows.windowSize} onChange={(e) => set('vinylWindows', { windowSize: e.target.value })}>
                <option value="2x2">24×24</option>
                <option value="2x3">24×36</option>
                <option value="3x3">36×36</option>
              </select>
            </div>
          )}
        </Checkbox>

        <Checkbox
          checked={options.octagonWindow.enabled}
          onChange={(v) => set('octagonWindow', { enabled: v })}
          label="Octagon Gable Window"
          price={OPTION_PRICES.window_octagon}
        />

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
          price={OPTION_PRICES.vent_octagon}
        />
      </AccordionGroup>

      {/* Exterior */}
      <AccordionGroup title="Exterior" selectedCount={extCount}>
        <Checkbox
          checked={options.shutters.enabled}
          onChange={(v) => set('shutters', { enabled: v })}
          label="15in Vinyl Shutters"
          price={OPTION_PRICES.shutters_per_pair * (options.shutters.pairs || 1)}
        >
          {options.shutters.enabled && (
            <select aria-label="Number of shutter pairs" style={SUB_SELECT} value={options.shutters.pairs} onChange={(e) => set('shutters', { pairs: parseInt(e.target.value, 10) })}>
              {[1,2,3,4].map((n) => (
                <option key={n} value={n}>{n} pair{n > 1 ? 's' : ''} — ${(OPTION_PRICES.shutters_per_pair * n).toLocaleString()}</option>
              ))}
            </select>
          )}
        </Checkbox>

        <Checkbox
          checked={options.ramp.enabled}
          onChange={(v) => set('ramp', { enabled: v })}
          label="Heavy Duty Treated Ramp"
          price={options.ramp.size === 'large' ? OPTION_PRICES.ramp_large : OPTION_PRICES.ramp_small}
        >
          {options.ramp.enabled && (
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { value: 'small', label: '6–8×4 ft', price: OPTION_PRICES.ramp_small },
                { value: 'large', label: '8–10×4 ft', price: OPTION_PRICES.ramp_large },
              ].map(({ value, label, price }) => (
                <label key={value} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', color: '#94a3b8', fontSize: 12 }}>
                  <input
                    type="radio" name="rampSize" value={value}
                    checked={options.ramp.size === value}
                    onChange={() => set('ramp', { size: value })}
                    style={{ accentColor: '#3b82f6' }}
                  />
                  {label} — ${price}
                </label>
              ))}
            </div>
          )}
        </Checkbox>
      </AccordionGroup>
    </div>
  );
};
