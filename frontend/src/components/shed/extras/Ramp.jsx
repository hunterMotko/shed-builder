import { useMemo } from 'react';
import * as THREE from 'three';

const FLOOR_THICKNESS = 0.125;
const RUNNER_SIZE = 0.333;
const GROUND_Y = -(FLOOR_THICKNESS + RUNNER_SIZE); // ~-0.46 ft
const RAMP_HEIGHT = Math.abs(GROUND_Y);
const SIDE_THICK = 0.14; // ft — triangular side panel thickness
const WALL_THICKNESS = 0.5;

/**
 * Ramp — slopes from ground up to shed floor.
 * Features a deck surface, grip cleats, and solid triangular side panels.
 */
export const Ramp = ({
  shedWidth,
  shedLength,
  wall = 'front',
  size = 'small',
}) => {
  const rampWidth  = size === 'large' ? 9 : 7;
  const rampLength = 4;
  const deckThick  = 0.1;

  const slopeAngle = useMemo(() => Math.atan2(RAMP_HEIGHT, rampLength), [rampLength]);
  const slopedLen  = useMemo(() => Math.sqrt(RAMP_HEIGHT ** 2 + rampLength ** 2), [rampLength]);
  const deckCenterY = GROUND_Y + RAMP_HEIGHT / 2;
  const deckCenterZ = rampLength / 2;

  const woodMat = { color: '#6B4C2A', roughness: 0.85, metalness: 0.0 };
  const cleatCount = Math.floor(rampLength);

  const halfW = shedWidth / 2;
  const halfL = shedLength / 2;

  const groupProps = useMemo(() => {
    switch (wall) {
      case 'front': return { position: [0, 0, halfL + WALL_THICKNESS / 2], rotation: [0, 0, 0] };
      case 'back':  return { position: [0, 0, -(halfL + WALL_THICKNESS / 2)], rotation: [0, Math.PI, 0] };
      case 'left':  return { position: [-(halfW + WALL_THICKNESS / 2), 0, 0], rotation: [0, -Math.PI / 2, 0] };
      case 'right': return { position: [(halfW + WALL_THICKNESS / 2), 0, 0], rotation: [0, Math.PI / 2, 0] };
      default:      return { position: [0, 0, 0], rotation: [0, 0, 0] };
    }
  }, [wall, halfW, halfL]);

  // Left side triangle shape: right triangle in the shape's XY plane
  // Shape X = ramp length direction (world Z after rotation)
  // Shape Y = vertical (world Y)
  // Vertices: floor/wall corner (0,0), ground/wall corner (0,GROUND_Y), ground/ramp-end (rampLength,GROUND_Y)
  const leftSideShape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(0, GROUND_Y);
    s.lineTo(rampLength, GROUND_Y);
    s.closePath();
    return s;
  }, [rampLength]);

  // Right side: mirrored shape with CCW winding so normals face outward
  const rightSideShape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(-rampLength, GROUND_Y);
    s.lineTo(0, GROUND_Y);
    s.closePath();
    return s;
  }, [rampLength]);

  const sideExtrude = useMemo(
    () => ({ depth: SIDE_THICK, bevelEnabled: false }),
    []
  );

  return (
    <group name="ramp" position={groupProps.position} rotation={groupProps.rotation}>
      {/* Deck surface */}
      <mesh
        position={[0, deckCenterY, deckCenterZ]}
        rotation={[-slopeAngle, 0, 0]}
        receiveShadow castShadow
      >
        <boxGeometry args={[rampWidth, deckThick, slopedLen]} />
        <meshStandardMaterial {...woodMat} />
      </mesh>

      {/* Left triangular side panel
          Rotation [0, -π/2, 0]: shape X → world Z, shape Y → world Y, extrusion → world -X
          Position at left deck edge so panel sits flush to edge and extends outward */}
      <mesh
        position={[-rampWidth / 2, 0, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        castShadow receiveShadow
      >
        <extrudeGeometry args={[leftSideShape, sideExtrude]} />
        <meshStandardMaterial {...woodMat} />
      </mesh>

      {/* Right triangular side panel
          Rotation [0, +π/2, 0]: mirrored shape X → world Z, extrusion → world +X */}
      <mesh
        position={[rampWidth / 2, 0, 0]}
        rotation={[0, Math.PI / 2, 0]}
        castShadow receiveShadow
      >
        <extrudeGeometry args={[rightSideShape, sideExtrude]} />
        <meshStandardMaterial {...woodMat} />
      </mesh>

      {/* Grip cleats across the deck surface */}
      {Array.from({ length: cleatCount }, (_, i) => {
        const t = (i + 1) / (cleatCount + 1);
        const zPos = t * rampLength;
        const yPos = GROUND_Y + t * RAMP_HEIGHT;
        return (
          <mesh key={i} position={[0, yPos + deckThick / 2 + 0.02, zPos]} castShadow>
            <boxGeometry args={[rampWidth, 0.04, 0.06]} />
            <meshStandardMaterial color="#5A3D22" roughness={0.9} />
          </mesh>
        );
      })}
    </group>
  );
};
