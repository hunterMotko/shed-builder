import { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { makeSidingShader } from '../../../utils/shaders';
import { gambrelEndOutline } from '../../../utils/roofGeometry';
import { octagonOpening } from '../../../utils/gableEndOpenings';
import { OctagonWindow } from '../openings/OctagonWindow';
import { OctagonVent } from '../openings/OctagonVent';

/**
 * BarnEnd — the gambrel-shaped end wall above the eave, in siding.
 *
 * The gambrel counterpart of `GableEnd`. A Barn used to get this face for free:
 * `GambrelRoof` was a solid prism and its end caps were drawn with the siding
 * shader. Now that the roof is a slab there are no caps to borrow, so the face
 * is its own piece of siding — which is the honest arrangement anyway, since it
 * is a wall and not a roof.
 *
 * The outline stops at the wall with no overhang; the roof slab laps over its
 * top edge, the same way the real siding tucks under the panel.
 */
export const BarnEnd = ({
  side,
  shedWidth,
  shedLength,
  wallHeight,
  roofLowerPitch,
  roofUpperPitch,
  color,
  sidingTexture,
  octagon = null,
  trimColor = '#654321',
  castShadow = true,
  receiveShadow = true,
}) => {
  const halfLength = shedLength / 2;

  const peakY = useMemo(
    () => gambrelEndOutline(shedWidth, roofLowerPitch, roofUpperPitch)
      .reduce((hi, p) => Math.max(hi, p[1]), -Infinity),
    [shedWidth, roofLowerPitch, roofUpperPitch]
  );

  // The octagon is a hole in the siding, not a disc drawn on it (issue #43).
  const geometry = useMemo(() => {
    const outline = gambrelEndOutline(shedWidth, roofLowerPitch, roofUpperPitch);
    const shape = new THREE.Shape();
    shape.moveTo(outline[0][0], outline[0][1]);
    for (const [x, y] of outline.slice(1)) shape.lineTo(x, y);
    shape.closePath();

    if (octagon) {
      const hole = new THREE.Path();
      const oct = octagonOpening(peakY).outline;
      hole.moveTo(oct[0][0], oct[0][1]);
      for (const [x, y] of oct.slice(1)) hole.lineTo(x, y);
      hole.closePath();
      shape.holes.push(hole);
    }

    return new THREE.ShapeGeometry(shape);
  }, [shedWidth, roofLowerPitch, roofUpperPitch, octagon, peakY]);

  // Reaches the mesh through <primitive>, which R3F never disposes (issue #20).
  useEffect(() => () => geometry.dispose(), [geometry]);

  const sidingShader = useMemo(
    () => makeSidingShader(color, sidingTexture),
    [color, sidingTexture]
  );

  // A hair proud of the wall face below it, the same 0.01 ft GableEnd uses, so
  // the two coplanar surfaces cannot fight for the same pixels.
  const EPSILON = 0.01;
  const posZ = side === 'front' ? halfLength + EPSILON : -(halfLength + EPSILON);

  const { center } = octagonOpening(peakY);
  const PLUG = 0.03;

  return (
    <group name={`barnEnd-${side}`}>
      <mesh
        position={[0, wallHeight, posZ]}
        rotation={side === 'front' ? [0, 0, 0] : [0, Math.PI, 0]}
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
