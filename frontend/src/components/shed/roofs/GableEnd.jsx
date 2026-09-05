import { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { makeSidingShader } from '../../../utils/shaders';
import { octagonOpening } from '../../../utils/gableEndOpenings';
import { OctagonWindow } from '../openings/OctagonWindow';
import { OctagonVent } from '../openings/OctagonVent';

/**
 * GableEnd — the triangular gable end panel above the eave.
 * Rendered with the siding shader to match the walls.
 *
 * `octagon` is what this end carries: `'window'`, `'vent'` or nothing. It is
 * per end because an octagon is bought per end — this used to be one boolean
 * that `GableShed` handed to both of its ends, so a Gable drew two windows and
 * charged for one (issue #43). Ask `octagonForEnd`; do not read the Option.
 */
export const GableEnd = ({
  side,
  shedWidth,
  shedLength,
  wallHeight,
  roofHeight = 4,
  color,
  sidingTexture,
  octagon = null,
  trimColor = '#654321',
  castShadow = true,
  receiveShadow = true,
}) => {
  const halfWidth  = shedWidth / 2;
  const halfLength = shedLength / 2;

  // The octagon is a hole in the siding, not a disc drawn on it. A `Shape`
  // takes holes and triangulates them; CSG is the wrong tool here because the
  // panel has no thickness for a solid to be subtracted from (issue #43).
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-halfWidth, 0);
    shape.lineTo(halfWidth, 0);
    shape.lineTo(0, roofHeight);
    shape.closePath();

    if (octagon) {
      const { outline } = octagonOpening(roofHeight);
      const hole = new THREE.Path();
      hole.moveTo(outline[0][0], outline[0][1]);
      for (const [x, y] of outline.slice(1)) hole.lineTo(x, y);
      hole.closePath();
      shape.holes.push(hole);
    }

    return new THREE.ShapeGeometry(shape);
  }, [halfWidth, roofHeight, octagon]);

  // Same lifetime problem as ShedWall's slab: this reaches the mesh through a
  // <primitive>, which R3F never disposes, so the memo owns it. Two triangles
  // times three buffers leaked on every width the customer passed through
  // (issue #20).
  useEffect(() => () => geometry.dispose(), [geometry]);

  const sidingShader = useMemo(
    () => makeSidingShader(color, sidingTexture),
    [color, sidingTexture]
  );

  // Push the triangle 0.01 ft proud of the wall outer face to prevent Z-fighting.
  // The front wall face is at exactly Z = halfLength (wall center + WALL_THICKNESS/2,
  // from utils/wallOpenings.js).
  const EPSILON = 0.01;
  const posZ = side === 'front' ? halfLength + EPSILON : -(halfLength + EPSILON);

  // Straddling the panel rather than standing off it: the frame's outer edge
  // is the hole's edge, so it plugs the opening instead of leaving a ring of
  // daylight round itself when seen from an angle.
  const { center } = octagonOpening(roofHeight);
  const PLUG = 0.03;

  return (
    <group name={`gableEnd-${side}`}>
      <mesh
        position={[0, wallHeight, posZ]}
        castShadow={castShadow}
        receiveShadow={receiveShadow}
      >
        <primitive object={geometry} attach="geometry" />
        <shaderMaterial args={[sidingShader]} side={THREE.DoubleSide} />
      </mesh>

      {octagon && (
        <group
          position={[
            center[0],
            wallHeight + center[1],
            posZ + (side === 'front' ? PLUG : -PLUG),
          ]}
        >
          {octagon === 'vent'
            ? <OctagonVent trimColor={trimColor} />
            : <OctagonWindow trimColor={trimColor} />}
        </group>
      )}
    </group>
  );
};
