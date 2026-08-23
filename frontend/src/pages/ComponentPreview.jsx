import { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';

import { DoorPreview }          from '../components/preview/DoorPreview';
import { WindowPreview }        from '../components/preview/WindowPreview';
import { GarageDoorPreview }    from '../components/preview/GarageDoorPreview';
import { SwingBarnDoorPreview } from '../components/preview/SwingBarnDoorPreview';
import { OctagonWindowPreview } from '../components/preview/OctagonWindowPreview';
import { RampPreview }          from '../components/preview/RampPreview';
import { PorchPreview }         from '../components/preview/PorchPreview';
import { SkylightPreview }      from '../components/preview/SkylightPreview';
import { ShuttersPreview }      from '../components/preview/ShuttersPreview';

const REGISTRY = [
  {
    id: 'door',
    label: 'Door',
    component: DoorPreview,
    camera: [0, 0, 14],
    target: [0, 0, 0],
    defaults: { width: 3, height: 7, trimColor: '#654321', wallColor: '#8B4513' },
    controls: [
      { key: 'width',     label: 'Width (ft)',  type: 'range', min: 2,   max: 4,   step: 0.5 },
      { key: 'height',    label: 'Height (ft)', type: 'range', min: 6,   max: 8,   step: 0.5 },
      { key: 'trimColor', label: 'Trim Color',  type: 'color' },
      { key: 'wallColor', label: 'Door Color',  type: 'color' },
    ],
  },
  {
    id: 'window',
    label: 'Window',
    component: WindowPreview,
    camera: [0, 0, 8],
    target: [0, 0, 0],
    defaults: { width: 2, height: 3, trimColor: '#654321' },
    controls: [
      { key: 'width',     label: 'Width (ft)',  type: 'range', min: 1, max: 4, step: 0.5 },
      { key: 'height',    label: 'Height (ft)', type: 'range', min: 1, max: 4, step: 0.5 },
      { key: 'trimColor', label: 'Trim Color',  type: 'color' },
    ],
  },
  {
    id: 'garageDoor',
    label: 'Garage Door',
    component: GarageDoorPreview,
    camera: [0, 2, 20],
    target: [0, 0, 0],
    defaults: { width: 8, height: 7, trimColor: '#8B7355' },
    controls: [
      { key: 'width',     label: 'Width (ft)',  type: 'range', min: 6,   max: 10,  step: 1 },
      { key: 'height',    label: 'Height (ft)', type: 'range', min: 6,   max: 8,   step: 0.5 },
      { key: 'trimColor', label: 'Trim Color',  type: 'color' },
    ],
  },
  {
    id: 'swingBarnDoor',
    label: 'Barn Door',
    component: SwingBarnDoorPreview,
    camera: [0, 0, 18],
    target: [0, 0, 0],
    defaults: { width: 6, height: 7, trimColor: '#654321', wallColor: '#D2691E' },
    controls: [
      { key: 'width',     label: 'Width (ft)',  type: 'range', min: 4, max: 10, step: 0.5 },
      { key: 'height',    label: 'Height (ft)', type: 'range', min: 6, max: 8,  step: 0.5 },
      { key: 'trimColor', label: 'Trim Color',  type: 'color' },
      { key: 'wallColor', label: 'Door Color',  type: 'color' },
    ],
  },
  {
    id: 'octagonWindow',
    label: 'Octagon Window',
    component: OctagonWindowPreview,
    camera: [0, 0, 5],
    target: [0, 0, 0],
    defaults: { radius: 0.75, trimColor: '#654321' },
    controls: [
      { key: 'radius',    label: 'Radius (ft)', type: 'range', min: 0.5, max: 1.5, step: 0.25 },
      { key: 'trimColor', label: 'Trim Color',  type: 'color' },
    ],
  },
  {
    id: 'ramp',
    label: 'Ramp',
    component: RampPreview,
    camera: [12, 5, 10],
    target: [0, 0, 3],
    defaults: { size: 'small' },
    controls: [
      {
        key: 'size',
        label: 'Size',
        type: 'select',
        options: [
          { value: 'small', label: 'Small (7 ft wide)' },
          { value: 'large', label: 'Large (9 ft wide)' },
        ],
      },
    ],
  },
  {
    id: 'porch',
    label: 'Porch',
    component: PorchPreview,
    camera: [20, 10, 24],
    target: [0, 4, 9],
    defaults: { shedWidth: 12, depth: 6, color: '#8B7355' },
    controls: [
      { key: 'shedWidth', label: 'Shed Width (ft)', type: 'range', min: 8, max: 20, step: 2 },
      { key: 'depth',     label: 'Depth (ft)',      type: 'range', min: 4, max: 10, step: 1 },
      { key: 'color',     label: 'Post Color',      type: 'color' },
    ],
  },
  {
    id: 'skylight',
    label: 'Skylight',
    component: SkylightPreview,
    camera: [6, 6, 10],
    target: [0, 0, 0],
    defaults: { runningFt: 8, numPanels: 4 },
    controls: [
      { key: 'runningFt', label: 'Length (ft)', type: 'range', min: 4, max: 16, step: 2 },
      { key: 'numPanels', label: 'Panels',      type: 'range', min: 2, max: 8,  step: 1 },
    ],
  },
  {
    id: 'shutters',
    label: 'Shutters',
    component: ShuttersPreview,
    camera: [0, 0, 10],
    target: [0, 0, 0],
    defaults: { width: 2, height: 3, shutterColor: '#FFFFFF' },
    controls: [
      { key: 'width',        label: 'Window Width (ft)',  type: 'range', min: 1, max: 4, step: 0.5 },
      { key: 'height',       label: 'Window Height (ft)', type: 'range', min: 1, max: 4, step: 0.5 },
      { key: 'shutterColor', label: 'Shutter Color',      type: 'color' },
    ],
  },
];

const PANEL_STYLE = {
  width: 260,
  flexShrink: 0,
  background: '#1e293b',
  padding: 16,
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  overflowY: 'auto',
};

const LABEL_STYLE = {
  display: 'block',
  color: '#94a3b8',
  fontSize: 11,
  marginBottom: 4,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const SELECT_STYLE = {
  width: '100%',
  background: '#334155',
  color: '#f1f5f9',
  border: '1px solid #475569',
  borderRadius: 4,
  padding: '4px 8px',
  fontSize: 13,
};

export function ComponentPreview() {
  const [selectedId, setSelectedId] = useState(REGISTRY[0].id);
  const [propValues, setPropValues] = useState({ ...REGISTRY[0].defaults });

  const entry = REGISTRY.find((r) => r.id === selectedId);
  const PreviewComponent = entry.component;

  function handleComponentChange(id) {
    const next = REGISTRY.find((r) => r.id === id);
    setSelectedId(id);
    setPropValues({ ...next.defaults });
  }

  function handlePropChange(key, raw) {
    const ctrl = entry.controls.find((c) => c.key === key);
    const value = ctrl?.type === 'range' ? parseFloat(raw) : raw;
    setPropValues((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div style={{ display: 'flex', height: '100%', background: '#0f172a' }}>
      {/* ── Left control panel ── */}
      <div style={PANEL_STYLE}>
        {/* Component selector */}
        <div>
          <label style={LABEL_STYLE}>Component</label>
          <select
            style={SELECT_STYLE}
            value={selectedId}
            onChange={(e) => handleComponentChange(e.target.value)}
          >
            {REGISTRY.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
        </div>

        {/* Dynamic controls */}
        {entry.controls.map((ctrl) => (
          <div key={ctrl.key}>
            <label style={LABEL_STYLE}>
              {ctrl.label}
              {ctrl.type === 'range' && (
                <span style={{ color: '#60a5fa', marginLeft: 6 }}>
                  {propValues[ctrl.key]}
                </span>
              )}
            </label>

            {ctrl.type === 'range' && (
              <input
                type="range"
                min={ctrl.min}
                max={ctrl.max}
                step={ctrl.step}
                value={propValues[ctrl.key]}
                onChange={(e) => handlePropChange(ctrl.key, e.target.value)}
                style={{ width: '100%' }}
              />
            )}

            {ctrl.type === 'color' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="color"
                  value={propValues[ctrl.key]}
                  onChange={(e) => handlePropChange(ctrl.key, e.target.value)}
                  style={{ width: 40, height: 28, border: 'none', cursor: 'pointer', background: 'none' }}
                />
                <span style={{ color: '#94a3b8', fontSize: 12 }}>{propValues[ctrl.key]}</span>
              </div>
            )}

            {ctrl.type === 'select' && (
              <select
                style={SELECT_STYLE}
                value={propValues[ctrl.key]}
                onChange={(e) => handlePropChange(ctrl.key, e.target.value)}
              >
                {ctrl.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            )}
          </div>
        ))}

        {/* Tip */}
        <p style={{ color: '#475569', fontSize: 11, marginTop: 'auto' }}>
          Drag to orbit · Scroll to zoom
        </p>
      </div>

      {/* ── 3-D canvas ── */}
      <div style={{ flex: 1 }}>
        <Canvas
          key={selectedId}
          camera={{ position: entry.camera, fov: 45 }}
          style={{ background: '#1e3a5f' }}
        >
          <ambientLight intensity={0.6} />
          <pointLight position={[15, 20, 10]} intensity={1} castShadow />
          <pointLight position={[-15, 20, -10]} intensity={0.5} />
          <Suspense fallback={null}>
            <PreviewComponent {...propValues} />
          </Suspense>
          <Grid
            infiniteGrid
            cellSize={1}
            cellThickness={0.4}
            sectionSize={5}
            sectionThickness={1}
            cellColor="#1e3a5f"
            sectionColor="#2563eb"
            fadeDistance={60}
            fadeStrength={1}
          />
          <OrbitControls target={entry.target} />
        </Canvas>
      </div>
    </div>
  );
}
