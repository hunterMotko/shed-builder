import * as THREE from 'three';

const OFFSET = 0.1;

function getOpeningTransform(placement, shedDimensions) {
  const { width, length, wallHeight } = shedDimensions;
  const { normalizedX, normalizedY, wall } = placement;
  const halfWidth  = width / 2;
  const halfLength = length / 2;
  const cx = -halfWidth + normalizedX * width;
  const cy = -wallHeight / 2 + normalizedY * wallHeight;
  switch (wall) {
    case 'front': return { pos: [cx, cy, halfLength + OFFSET],  rot: [0, 0, 0] };
    case 'back':  return { pos: [cx, cy, -halfLength - OFFSET], rot: [0, Math.PI, 0] };
    case 'left':  return { pos: [-halfWidth - OFFSET, cy, -halfLength + normalizedX * length], rot: [0,  Math.PI / 2, 0] };
    case 'right': return { pos: [ halfWidth + OFFSET, cy, -halfLength + normalizedX * length], rot: [0, -Math.PI / 2, 0] };
    default:      return { pos: [0, 0, 0], rot: [0, 0, 0] };
  }
}

// Module-level component — not re-created on each render
function DoorLeaf({ leafW, leafH, isRight, woodColor, trimColor, metalColor }) {
  const stileW   = 0.10;
  const railH    = 0.14;
  const slab     = 0.07;
  const frameZ   = 0.028;

  // Inner panel area (inside the frame)
  const innerW   = leafW - stileW * 2;
  const innerH   = leafH - railH * 2;
  const diagLen  = Math.sqrt(innerW ** 2 + innerH ** 2);
  const diagAngle = Math.atan2(innerH, innerW);

  // Hinge edge: left edge for left leaf, right edge for right leaf
  const hingeEdgeX = isRight ? leafW / 2 : -leafW / 2;
  // Strap extends inward from hinge edge
  const strapDir   = isRight ? -1 : 1;

  const hingeYs = [leafH / 2 - 0.3, 0, -(leafH / 2 - 0.3)];

  return (
    <group>
      {/* Wood slab */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[leafW, leafH, slab]} />
        <meshStandardMaterial color={woodColor} roughness={0.80} metalness={0.0} />
      </mesh>

      {/* Top rail */}
      <mesh position={[0, leafH / 2 - railH / 2, slab / 2 + frameZ / 2]} castShadow>
        <boxGeometry args={[leafW, railH, frameZ]} />
        <meshStandardMaterial color={trimColor} roughness={0.55} />
      </mesh>

      {/* Bottom rail */}
      <mesh position={[0, -(leafH / 2 - railH / 2), slab / 2 + frameZ / 2]} castShadow>
        <boxGeometry args={[leafW, railH, frameZ]} />
        <meshStandardMaterial color={trimColor} roughness={0.55} />
      </mesh>

      {/* Hinge stile */}
      <mesh position={[hingeEdgeX + strapDir * stileW / 2, 0, slab / 2 + frameZ / 2]} castShadow>
        <boxGeometry args={[stileW, leafH, frameZ]} />
        <meshStandardMaterial color={trimColor} roughness={0.55} />
      </mesh>

      {/* Meeting stile (opposite of hinge side) */}
      <mesh position={[-(hingeEdgeX + strapDir * stileW / 2), 0, slab / 2 + frameZ / 2]} castShadow>
        <boxGeometry args={[stileW, leafH, frameZ]} />
        <meshStandardMaterial color={trimColor} roughness={0.55} />
      </mesh>

      {/* Z-brace diagonal (single per leaf: top-hinge to bottom-inner) */}
      <mesh
        position={[0, 0, slab / 2 + frameZ + 0.008]}
        rotation={[0, 0, isRight ? diagAngle : -diagAngle]}
        castShadow
      >
        <boxGeometry args={[diagLen, 0.038, 0.018]} />
        <meshStandardMaterial color={trimColor} roughness={0.55} />
      </mesh>

      {/* 3 strap hinges on hinge edge */}
      {hingeYs.map((hy, i) => (
        <group key={i} position={[hingeEdgeX, hy, slab / 2 + 0.018]}>
          {/* Cylindrical knuckle pin */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.022, 0.022, 0.055, 8]} />
            <meshStandardMaterial color={metalColor} roughness={0.38} metalness={0.72} />
          </mesh>
          {/* Flat strap extending across door face */}
          <mesh position={[strapDir * 0.15, 0, -0.005]}>
            <boxGeometry args={[0.30, 0.044, 0.014]} />
            <meshStandardMaterial color={metalColor} roughness={0.38} metalness={0.72} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * SwingBarnDoor — double-leaf carriage doors with X-brace and strap hinges.
 * Each leaf is hinged on its outer edge and meets at the center when closed.
 */
export const SwingBarnDoor = ({
  placement,
  shedDimensions,
  trimColor = '#654321',
  wallColor = '#D2691E',
}) => {
  const leafW = placement.width / 2;
  const leafH = placement.height;
  const { pos, rot } = getOpeningTransform(placement, shedDimensions);

  return (
    <group position={pos} rotation={rot}>
      {/* Left leaf — hinged on left outer edge */}
      <group position={[-leafW / 2, 0, 0]}>
        <DoorLeaf
          leafW={leafW} leafH={leafH}
          isRight={false}
          woodColor={wallColor}
          trimColor={trimColor}
          metalColor="#3a3a3a"
        />
      </group>

      {/* Right leaf — hinged on right outer edge */}
      <group position={[leafW / 2, 0, 0]}>
        <DoorLeaf
          leafW={leafW} leafH={leafH}
          isRight={true}
          woodColor={wallColor}
          trimColor={trimColor}
          metalColor="#3a3a3a"
        />
      </group>

      {/* Drop hasp at center meeting edge */}
      <mesh position={[0, 0, 0.055]}>
        <boxGeometry args={[0.08, 0.18, 0.025]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.35} metalness={0.75} />
      </mesh>
    </group>
  );
};
