import { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { BarnShed } from '../components/BarnShed/BarnShed';
import { GableShed } from '../components/GableShed/GableShed';
import { REFERENCE_TARGETS } from './referenceTargets';

const badge = {
  position: 'absolute', top: 12, left: 12, zIndex: 1,
  background: 'rgba(15,23,42,0.85)',
  color: '#94a3b8', fontSize: 11, fontWeight: 600,
  padding: '4px 10px', borderRadius: 4,
  letterSpacing: '0.05em', textTransform: 'uppercase',
};

const caption = {
  position: 'absolute', bottom: 12, left: '50%',
  transform: 'translateX(-50%)', zIndex: 1,
  background: 'rgba(15,23,42,0.75)',
  color: '#64748b', fontSize: 11,
  padding: '3px 10px', borderRadius: 4,
  whiteSpace: 'nowrap',
};

const targetBtn = (active) => ({
  background: active ? '#1e293b' : 'transparent',
  border: '1px solid #334155',
  color: active ? '#93c5fd' : '#94a3b8',
  fontSize: 11, fontWeight: active ? 600 : 400,
  padding: '3px 10px', borderRadius: 4, cursor: 'pointer',
});

/**
 * Reference Match — a Reference Photo beside the same building rendered by the
 * real shed components.
 *
 * The reconstruction goes through `BarnShed` / `GableShed` driven by a Design
 * fixture, so anything done to close the gap with the photo lands in the
 * product (ADR-0012). It used to be a fork of those components, and fidelity
 * work done in the fork reached nothing.
 */
export function ReferenceMatch() {
  const [targetId, setTargetId] = useState(REFERENCE_TARGETS[0].id);
  const target = REFERENCE_TARGETS.find((t) => t.id === targetId) ?? REFERENCE_TARGETS[0];
  const Shed = target.model === 'Barn' ? BarnShed : GableShed;

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* ── Left: reference photo ───────────────────────────────── */}
      <div style={{
        flex: 1,
        position: 'relative',
        borderRight: '2px solid #1e293b',
        background: '#0f172a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <span style={badge}>Reference Photo</span>

        {REFERENCE_TARGETS.length > 1 && (
          <div style={{
            position: 'absolute', top: 12, right: 12, zIndex: 1,
            display: 'flex', gap: 6,
          }}>
            {REFERENCE_TARGETS.map((t) => (
              <button
                key={t.id}
                style={targetBtn(t.id === target.id)}
                onClick={() => setTargetId(t.id)}
              >
                {t.id}
              </button>
            ))}
          </div>
        )}

        <img
          src={target.photo}
          alt={target.photoAlt}
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
        />
        <div style={caption}>{target.photoCaption}</div>
      </div>

      {/* ── Right: 3D reconstruction ─────────────────────────────── */}
      <div style={{ flex: 1, position: 'relative' }}>
        <span style={badge}>3D Reconstruction</span>
        <div style={caption}>{target.designCaption}</div>

        <Canvas
          camera={target.camera}
          shadows
          style={{ width: '100%', height: '100%', background: '#d4d8d0' }}
        >
          <ambientLight intensity={0.55} />
          <directionalLight
            position={[18, 28, 14]}
            intensity={1.4}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          <pointLight position={[-12, 16, -12]} intensity={0.35} />
          <Suspense fallback={null}>
            <Shed design={target.design} />
          </Suspense>
          <OrbitControls target={target.target} minDistance={8} maxDistance={60} />
        </Canvas>
      </div>
    </div>
  );
}
