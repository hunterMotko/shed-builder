import { useMemo } from 'react';
import * as THREE from 'three';
import { WALL_THICKNESS, openingTransform } from '../../../utils/wallOpenings';

const FLOOR_THICKNESS = 0.125;
const RUNNER_SIZE = 0.333;
const GROUND_Y = -(FLOOR_THICKNESS + RUNNER_SIZE); // ~-0.46 ft
const RAMP_HEIGHT = Math.abs(GROUND_Y);
const SIDE_THICK = 0.14; // ft — triangular side panel thickness


/**
 * Ramp — slopes from ground up to shed floor.
 * Features a deck surface, grip cleats, and solid triangular side panels.
 *
 * A ramp meets a garage door: `ramp_small` is 7 ft wide and `ramp_large` 9 ft,
 * which is a door apron and not a doorstep. So it takes the door's own
 * Placement and stands where `openingTransform` puts it — it used to work out
 * its own wall position from a private copy of the same switch and sat centred
 * on the wall wherever the door actually was (issue #44, ADR-0011).
 *
 * `placement` may be absent while nothing can create one (issue #10); the ramp
 * then falls back to the centre of the front wall, which is where it has
 * always been.
 */
export const Ramp = ({
  shedWidth,
  shedLength,
  wallHeight,
  placement = null,
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

  // The door's own transform, taken at the floor: the ramp shares the door's
  // wall, its rotation and its position along that wall, and differs only in
  // sitting on the ground rather than at the opening's centre height. With no
  // door to follow it is centred, which is a Placement of normalizedX 0.5.
  const groupProps = useMemo(() => {
    const anchor = placement ?? { wall, normalizedX: 0.5, normalizedY: 0 };
    const { position, rotation } = openingTransform(
      anchor,
      { width: shedWidth, length: shedLength, wallHeight },
      WALL_THICKNESS / 2
    );
    return { position: [position[0], 0, position[2]], rotation };
  }, [placement, wall, shedWidth, shedLength, wallHeight]);

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
