import { useMemo } from 'react';
import * as THREE from 'three';

/**
 * OctagonWindow — decorative octagon gable window.
 *
 * Placed at the center of a GableEnd triangle; no CSG cutout needed (rendered on top).
 * Consists of:
 *   - Outer octagon frame (trim color, extruded)
 *   - Inner glass octagon (semi-transparent blue)
 *   - 8 radial muntins from center to vertices
 */
export const OctagonWindow = ({ radius = 0.75, trimColor = '#654321' }) => {
  const SIDES = 8;
  const frameThick = 0.06;
  const depth = 0.06;

  // Outer octagon shape
  const outerShape = useMemo(() => {
    const shape = new THREE.Shape();
    for (let i = 0; i < SIDES; i++) {
      const angle = (Math.PI / SIDES) + (i * 2 * Math.PI) / SIDES;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y);
    }
    shape.closePath();
    return shape;
  }, [radius]);

  // Inner octagon hole (glass area)
  const innerR = radius - frameThick;
  const innerShape = useMemo(() => {
    const shape = new THREE.Shape();
    for (let i = 0; i < SIDES; i++) {
      const angle = (Math.PI / SIDES) + (i * 2 * Math.PI) / SIDES;
      const x = innerR * Math.cos(angle);
      const y = innerR * Math.sin(angle);
      i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y);
    }
    shape.closePath();
    return shape;
  }, [innerR]);

  // Frame geometry (outer minus inner via hole)
  const frameShape = useMemo(() => {
    const shape = outerShape.clone();
    const hole = innerShape.clone();
    shape.holes.push(hole);
    return shape;
  }, [outerShape, innerShape]);

  const extrudeSettings = { depth, bevelEnabled: false };

  // 8 radial muntin lines from center to each vertex
  const muntins = useMemo(() => {
    return Array.from({ length: SIDES }, (_, i) => {
      const angle = (Math.PI / SIDES) + (i * 2 * Math.PI) / SIDES;
      const ex = innerR * Math.cos(angle);
      const ey = innerR * Math.sin(angle);
      const len = Math.sqrt(ex * ex + ey * ey);
      const midX = ex / 2;
      const midY = ey / 2;
      const rotation = Math.atan2(ey, ex) + Math.PI / 2;
      return { midX, midY, len, rotation };
    });
  }, [innerR]);

  return (
    <group name="octagonWindow">
      {/* Frame ring */}
      <mesh castShadow position={[0, 0, -depth / 2]}>
        <extrudeGeometry args={[frameShape, extrudeSettings]} />
        <meshStandardMaterial color={trimColor} roughness={0.4} metalness={0.1} />
      </mesh>

      {/* Glass pane */}
      <mesh position={[0, 0, depth / 2 - 0.005]}>
        <shapeGeometry args={[innerShape]} />
        <meshStandardMaterial
          color="#88CCFF"
          transparent
          opacity={0.4}
          roughness={0.05}
          metalness={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 8 radial muntins */}
      {muntins.map(({ midX, midY, len, rotation }, i) => (
        <mesh key={i} position={[midX, midY, depth / 2]} rotation={[0, 0, rotation]}>
          <boxGeometry args={[0.025, len, 0.025]} />
          <meshStandardMaterial color={trimColor} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
};
