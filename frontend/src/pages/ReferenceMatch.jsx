import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { RefBarnScene } from './reference-match/RefBarnScene';

export function ReferenceMatch() {
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
        <span style={{
          position: 'absolute', top: 12, left: 12,
          background: 'rgba(15,23,42,0.85)',
          color: '#94a3b8', fontSize: 11, fontWeight: 600,
          padding: '4px 10px', borderRadius: 4,
          letterSpacing: '0.05em', textTransform: 'uppercase',
        }}>
          Reference Photo
        </span>
        <img
          src="/ref_barn_barndoors.jpg"
          alt="Reference: dark green barn shed with double barn doors and white trim"
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
          }}
        />
        <div style={{
          position: 'absolute', bottom: 12, left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(15,23,42,0.75)',
          color: '#64748b', fontSize: 11,
          padding: '3px 10px', borderRadius: 4,
          whiteSpace: 'nowrap',
        }}>
          barn_barndoors.jpg — target: dark green · white trim · silver metal roof
        </div>
      </div>

      {/* ── Right: 3D reconstruction ─────────────────────────────── */}
      <div style={{ flex: 1, position: 'relative' }}>
        <span style={{
          position: 'absolute', top: 12, left: 12, zIndex: 1,
          background: 'rgba(15,23,42,0.85)',
          color: '#94a3b8', fontSize: 11, fontWeight: 600,
          padding: '4px 10px', borderRadius: 4,
          letterSpacing: '0.05em', textTransform: 'uppercase',
        }}>
          3D Reconstruction
        </span>
        <div style={{
          position: 'absolute', bottom: 12, left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1,
          background: 'rgba(15,23,42,0.75)',
          color: '#64748b', fontSize: 11,
          padding: '3px 10px', borderRadius: 4,
          whiteSpace: 'nowrap',
        }}>
          12 × 20 × 8 ft · #2B5219 · white trim · silver metal
        </div>

        <Canvas
          camera={{ position: [22, 12, 24], fov: 45 }}
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
            <RefBarnScene />
          </Suspense>
          <OrbitControls target={[0, 4, 0]} minDistance={8} maxDistance={60} />
        </Canvas>
      </div>
    </div>
  );
}
