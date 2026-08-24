import { useState } from 'react';
import { useShedStore } from '../store/shedStore';
import { useDesignPersistence } from '../hooks/useDesignPersistence';
import { DimensionsSection }     from './controls/DimensionsSection';
import { ModelSection }          from './controls/ModelSection';
import { TrimAndDetailsSection } from './controls/TrimAndDetailsSection';
import { ColorSection }          from './controls/ColorSection';
import { OptionsSection }         from './controls/OptionsSection';
import { ActionButtons }         from './controls/ActionButtons';
import { lookupBasePrice, getOptionLineItems } from '../utils/pricingUtils';

const TABS = [
  { id: 'dimensions', label: 'Size' },
  { id: 'model',      label: 'Model' },
  { id: 'colors',     label: 'Colors' },
  { id: 'options',    label: 'Options' },
];

export const ControlPanel = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('dimensions');

  const { model, color, roofColor, setModel, setColor, setRoofColor,
          width, length, wallHeight, options, reset } = useShedStore();
  const { save, load, isLoading } = useDesignPersistence();

  const base     = lookupBasePrice(width, length, wallHeight) ?? 0;
  const optionAmt = getOptionLineItems(options).reduce((s, i) => s + i.amount, 0);
  const total    = base + optionAmt;

  const handleSave = async () => {
    try {
      const saved = await save();
      alert(`Design saved!\nID: ${saved.id}\nPrice: $${saved.price?.toFixed(2) ?? total}`);
    } catch (e) {
      alert(`Save failed: ${e.userMessage || e.message}`);
    }
  };

  const handleLoad = async () => {
    const id = prompt('Enter design ID:');
    if (!id?.trim()) return;
    try {
      await load(id.trim());
    } catch (e) {
      alert(`Load failed: ${e.userMessage || e.message}`);
    }
  };

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      backgroundColor: '#1e293b',
      userSelect: 'none',
    }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{
        height: 52, flexShrink: 0,
        display: 'flex', alignItems: 'center',
        padding: '0 12px', gap: 8,
        borderBottom: '1px solid #334155',
      }}>
        <button
          onClick={onClose}
          title="Close panel"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#64748b', fontSize: 18, lineHeight: 1,
            padding: '4px 6px', borderRadius: 4,
            transition: 'color 120ms',
          }}
          onMouseEnter={(e) => e.target.style.color = '#94a3b8'}
          onMouseLeave={(e) => e.target.style.color = '#64748b'}
        >
          ‹
        </button>
        <span style={{ flex: 1, color: '#cbd5e1', fontSize: 13, fontWeight: 600, letterSpacing: '0.01em' }}>
          Shed Designer
        </span>
        <span style={{ color: '#4ade80', fontSize: 15, fontWeight: 700 }}>
          ${total.toLocaleString()}
        </span>
      </div>

      {/* ── Tab strip ──────────────────────────────────────────── */}
      <div style={{
        display: 'flex', flexShrink: 0,
        backgroundColor: '#0f172a',
        borderBottom: '1px solid #1e293b',
      }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, padding: '10px 4px',
              border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 11, fontWeight: activeTab === tab.id ? 600 : 400,
              color: activeTab === tab.id ? '#93c5fd' : '#64748b',
              borderBottom: `2px solid ${activeTab === tab.id ? '#3b82f6' : 'transparent'}`,
              transition: 'color 150ms, border-color 150ms',
              letterSpacing: '0.03em',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px' }}>
        <div className="tab-panel" key={activeTab}>
          {activeTab === 'dimensions' && (
            <DimensionsSection />
          )}

          {activeTab === 'model' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <ModelSection model={model} onModelChange={setModel} />
              <TrimAndDetailsSection />
            </div>
          )}

          {activeTab === 'colors' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <ColorSection label="Siding Color" currentColor={color} onColorChange={setColor} colorType="siding" />
              <ColorSection label="Roof Color" currentColor={roofColor} onColorChange={setRoofColor} colorType="roof" />
            </div>
          )}

          {activeTab === 'options' && (
            <OptionsSection />
          )}
        </div>
      </div>

      {/* ── Footer actions ─────────────────────────────────────── */}
      <div style={{
        flexShrink: 0,
        padding: '12px 14px',
        borderTop: '1px solid #334155',
      }}>
        <ActionButtons
          onSave={handleSave}
          onLoad={handleLoad}
          onReset={reset}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};
