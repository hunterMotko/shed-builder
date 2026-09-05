import { useMemo } from 'react';
import * as THREE from 'three';
import { OCTAGON_RADIUS } from '../../../utils/gableEndOpenings';

/**
 * OctagonVent — the louvered octagon gable vent.
 *
 * The same outline as `OctagonWindow` in the same hole, with louvers instead
 * of glass and a closed back: a vent reads dark, not bright, and you cannot
 * see the sky through it. The slats are angled the way `Shutters` angles its
 * own, which is the same part doing the same job on a different opening.
 *
 * `catalog.json` has priced `vent_octagon` at $85 since the beginning and
 * nothing rendered it (issue #43).
 */
export const OctagonVent = ({ radius = OCTAGON_RADIUS, trimColor = '#654321' }) => {
  const SIDES = 8;
  const frameThick = 0.06;
  const depth = 0.06;
  const innerR = radius - frameThick;

  // Shutters angle their slats at PI/5; a gable vent is the same louver.
  const SLAT_ANGLE = Math.PI / 5;
  const SLAT_COUNT = 5;

  const octagon = (r) => {
    const shape = new THREE.Shape();
    for (let i = 0; i < SIDES; i++) {
      const angle = Math.PI / SIDES + (i * 2 * Math.PI) / SIDES;
      const x = r * Math.cos(angle);
      const y = r * Math.sin(angle);
      i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y);
    }
    shape.closePath();
    return shape;
  };

  const outerShape = useMemo(() => octagon(radius), [radius]);
  const innerShape = useMemo(() => octagon(innerR), [innerR]);

  const frameShape = useMemo(() => {
    const shape = outerShape.clone();
    shape.holes.push(innerShape.clone());
    return shape;
  }, [outerShape, innerShape]);

  // Slats span the octagon's inscribed width at their own height, so the
  // louver fills the opening corner to corner rather than sitting in a square.
  const slats = useMemo(() => {
    const step = (2 * innerR) / (SLAT_COUNT + 1);
    return Array.from({ length: SLAT_COUNT }, (_, i) => {
      const y = -innerR + step * (i + 1);
      const halfChord = Math.sqrt(Math.max(innerR * innerR - y * y, 0));
      return { y, len: 2 * halfChord };
    });
  }, [innerR]);

  return (
    <group name="octagonVent">
      {/* Frame ring */}
      <mesh castShadow position={[0, 0, -depth / 2]}>
        <extrudeGeometry args={[frameShape, { depth, bevelEnabled: false }]} />
        <meshStandardMaterial color={trimColor} roughness={0.6} metalness={0} />
      </mesh>

      {/* Closed back — a vent is dark behind its louvers, not open to the sky */}
      <mesh position={[0, 0, -depth / 2]}>
        <shapeGeometry args={[innerShape]} />
        <meshStandardMaterial color="#1A1A1A" roughness={0.9} metalness={0} side={THREE.DoubleSide} />
      </mesh>

      {/* Louvers */}
      {slats.map(({ y, len }, i) => (
        <mesh key={i} position={[0, y, 0]} rotation={[SLAT_ANGLE, 0, 0]} castShadow>
          <boxGeometry args={[len, 0.055, 0.02]} />
          <meshStandardMaterial color={trimColor} roughness={0.5} metalness={0} />
        </mesh>
      ))}
    </group>
  );
};
