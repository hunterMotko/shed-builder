import { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { BarnShed } from './components/BarnShed/BarnShed';
import { GableShed } from './components/GableShed/GableShed';
import { ControlPanel } from './components/ControlPanel';
import { ComponentPreview } from './pages/ComponentPreview';
import { ReferenceMatch } from './pages/ReferenceMatch';
import { useShedStore } from './store/shedStore';
import { lookupBasePrice, getOptionLineItems, CATALOG_PEAK_HEIGHT } from './utils/pricingUtils';
import { wallHeightFt, peakHeightFt, FOUNDATION_HEIGHT } from './utils/modelSpec';
import './App.css';

const NAV_H  = 48;
const DRAWER = 320;

const navBtn = (active) => ({
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: active ? 600 : 400,
  color: active ? '#93c5fd' : '#94a3b8',
  padding: '4px 12px',
  borderRadius: 4,
});

export default function App() {
  const [page, setPage]           = useState('configurator');
  const [drawerOpen, setDrawerOpen] = useState(true);

  const { width, length, tier, model, color, roofColor, options,
          roofLowerPitch, roofUpperPitch } = useShedStore();

  // The wall is a fixed stud length per Model; the roof sits on top of it, so
  // the peak follows from the Model and the width (issue #29).
  const wallHeight = wallHeightFt(model);
  const peak = peakHeightFt(model, width, FOUNDATION_HEIGHT,
    { lowerPitch: roofLowerPitch, upperPitch: roofUpperPitch });

  // Price for canvas overlay
  const base      = lookupBasePrice(width, length, tier) ?? 0;
  const optionTotal = getOptionLineItems(options).reduce((s, i) => s + i.amount, 0);
  const total     = base + optionTotal;

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Nav bar ─────────────────────────────────────────────── */}
      <nav style={{
        height: NAV_H, flexShrink: 0,
        backgroundColor: '#0f172a',
        display: 'flex', alignItems: 'center',
        padding: '0 16px', gap: 8,
        boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
      }}>
        <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 15, marginRight: 16 }}>
          Shed Designer
        </span>
        <button style={navBtn(page === 'configurator')} onClick={() => setPage('configurator')}>
          Configurator
        </button>
        <button style={navBtn(page === 'preview')} onClick={() => setPage('preview')}>
          Component Preview
        </button>
        <button style={navBtn(page === 'reference')} onClick={() => setPage('reference')}>
          Reference Match
        </button>
      </nav>

      {/* ── Page content ────────────────────────────────────────── */}
      {page === 'configurator' ? (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', backgroundColor: '#5B8DB8' }}>

          {/* Sliding drawer */}
          <div style={{
            width: drawerOpen ? DRAWER : 0,
            flexShrink: 0,
            overflow: 'hidden',
            transition: 'width 280ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}>
            <div style={{ width: DRAWER, height: '100%' }}>
              <ControlPanel onClose={() => setDrawerOpen(false)} />
            </div>
          </div>

          {/* Canvas area */}
          <div style={{ flex: 1, position: 'relative' }}>

            {/* Toggle tab — left edge of canvas */}
            <button
              onClick={() => setDrawerOpen((o) => !o)}
              className={drawerOpen ? '' : 'toggle-pulse'}
              title={drawerOpen ? 'Close panel' : 'Open panel'}
              aria-expanded={drawerOpen}
              aria-label={drawerOpen ? 'Close configuration panel' : 'Open configuration panel'}
              style={{
                position: 'absolute', left: 0, top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 10,
                width: 24, height: 56,
                background: '#334155',
                border: 'none',
                borderRadius: '0 8px 8px 0',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg
                width="12" height="12" viewBox="0 0 12 12" fill="none"
                style={{
                  color: '#93c5fd',
                  transform: drawerOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 250ms cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* 3D Canvas */}
            <Canvas camera={{ position: [25, 20, 25], fov: 50 }} style={{ width: '100%', height: '100%' }}>
              <ambientLight intensity={0.6} />
              <pointLight position={[15, 20, 10]} intensity={1} />
              <pointLight position={[-15, 20, -10]} intensity={0.5} />
              <Suspense fallback={null}>
                {model === 'Barn' ? (
                  <BarnShed width={width} length={length} wallHeight={wallHeight} color={color} roofColor={roofColor} />
                ) : (
                  <GableShed width={width} length={length} wallHeight={wallHeight} color={color} roofColor={roofColor} />
                )}
              </Suspense>
              <OrbitControls />
            </Canvas>

            {/* Price overlay bar */}
            <div
              aria-live="polite"
              style={{
                position: 'absolute', bottom: 20, left: '50%',
                transform: 'translateX(-50%)',
                backdropFilter: 'blur(10px)',
                backgroundColor: 'rgba(15, 23, 42, 0.78)',
                border: '1px solid rgba(148,163,184,0.15)',
                borderRadius: 32,
                padding: '9px 24px',
                display: 'flex', alignItems: 'center', gap: 16,
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
              }}
            >
              <span style={{ color: '#94a3b8', fontSize: 13 }}>
                {width} × {length} × {CATALOG_PEAK_HEIGHT} ft &nbsp;·&nbsp; {tier}
                &nbsp;·&nbsp; {peak.toFixed(1)} ft to the peak
              </span>
              <span style={{ color: '#4ade80', fontSize: 16, fontWeight: 700 }}>
                ${total.toLocaleString()}
              </span>
              <span style={{ color: '#64748b', fontSize: 12 }}>est.</span>
            </div>
          </div>
        </div>
      ) : page === 'preview' ? (
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <ComponentPreview />
        </div>
      ) : (
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <ReferenceMatch />
        </div>
      )}
    </div>
  );
}
