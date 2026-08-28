import { useMemo } from 'react';
import * as THREE from 'three';

/**
 * Mirrors DoorObject's world-space positioning formula.
 * Barn doors sit flush against the wall face (smaller OFFSET than swing doors).
 */
function getOpeningTransform(placement, shedDimensions) {
  const { width, length, wallHeight } = shedDimensions;
  const { normalizedX, normalizedY, wall } = placement;
  const halfWidth  = width / 2;
  const halfLength = length / 2;
  const OFFSET = 0.12; // sits just proud of wall surface

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

/**
 * Single door leaf: outer frame + X-brace diagonals + roller hardware.
 */
function DoorLeaf({ leafWidth, elemHeight, panelColor, trimColor, mirror = false }) {
  const diagLen = Math.sqrt((leafWidth - 0.3) ** 2 + (elemHeight - 0.3) ** 2);
  const scaleX  = mirror ? -1 : 1;

  return (
    <group scale={[scaleX, 1, 1]}>
      {/* Main board panel */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[leafWidth - 0.06, elemHeight - 0.06, 0.08]} />
        <meshStandardMaterial color={panelColor} roughness={0.75} metalness={0.0} />
      </mesh>

      {/* Outer frame — top, bottom, left, right rails */}
      {[
        [0,  (elemHeight - 0.1) / 2, 0.05, [leafWidth - 0.06, 0.1, 0.04]],  // top
        [0, -(elemHeight - 0.1) / 2, 0.05, [leafWidth - 0.06, 0.1, 0.04]],  // bottom
        [-(leafWidth - 0.18) / 2, 0, 0.05, [0.1, elemHeight - 0.2, 0.04]],  // left
        [ (leafWidth - 0.18) / 2, 0, 0.05, [0.1, elemHeight - 0.2, 0.04]],  // right
      ].map(([x, y, z, dims], i) => (
        <mesh key={i} position={[x, y, z]} castShadow>
          <boxGeometry args={dims} />
          <meshStandardMaterial color={trimColor} roughness={0.6} metalness={0} />
        </mesh>
      ))}

      {/* Z-brace diagonal */}
      <mesh
        position={[0, 0, 0.055]}
        rotation={[0, 0, -Math.PI / 4]}
        castShadow
      >
        <boxGeometry args={[diagLen, 0.09, 0.03]} />
        <meshStandardMaterial color={trimColor} roughness={0.6} metalness={0} />
      </mesh>

      {/* Roller wheels (2 per leaf) */}
      {[-leafWidth * 0.3, leafWidth * 0.3].map((x, i) => (
        <mesh key={i} position={[x, elemHeight / 2 + 0.15, 0.06]}>
          <cylinderGeometry args={[0.075, 0.075, 0.07, 12]} />
          <meshStandardMaterial color="#3a3a3a" roughness={0.3} metalness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * BarnDoor — sliding barn-style door.
 *
 * Two leaves park beside the opening (one left, one right) on a track above the header.
 * The CSG cutout in ShedWall creates the actual opening; this component renders
 * the visible door hardware and panels positioned beside the hole.
 */
export const BarnDoor = ({
  placement,
  shedDimensions,
  trimColor = '#654321',
  wallColor = '#D2691E',
}) => {
  const elemWidth  = placement.width;
  const elemHeight = placement.height;
  const leafWidth  = elemWidth / 2;

  const { pos, rot } = useMemo(
    () => getOpeningTransform(placement, shedDimensions),
    [placement, shedDimensions]
  );

  return (
    <group position={pos} rotation={rot}>
      {/* Track rail spans door + overhang on both sides */}
      <mesh position={[0, elemHeight / 2 + 0.2, 0.05]}>
        <boxGeometry args={[elemWidth * 2.2, 0.07, 0.04]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.4} metalness={0.9} />
      </mesh>

      {/* Left leaf — parked left of the opening */}
      <group position={[-elemWidth * 0.75, 0, 0]}>
        <DoorLeaf
          leafWidth={leafWidth}
          elemHeight={elemHeight}
          panelColor={wallColor}
          trimColor={trimColor}
        />
      </group>

      {/* Right leaf — parked right of the opening (mirrored) */}
      <group position={[elemWidth * 0.75, 0, 0]}>
        <DoorLeaf
          leafWidth={leafWidth}
          elemHeight={elemHeight}
          panelColor={wallColor}
          trimColor={trimColor}
          mirror
        />
      </group>
    </group>
  );
};
