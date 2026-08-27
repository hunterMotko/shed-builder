import { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { makeSidingShader } from '../../../utils/shaders';
import { gambrelEndOutline } from '../../../utils/roofGeometry';
import { OctagonWindow } from '../openings/OctagonWindow';

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
  showOctagonWindow = false,
  trimColor = '#654321',
  castShadow = true,
  receiveShadow = true,
}) => {
  const halfLength = shedLength / 2;

  const geometry = useMemo(() => {
    const outline = gambrelEndOutline(shedWidth, roofLowerPitch, roofUpperPitch);
    const shape = new THREE.Shape();
    shape.moveTo(outline[0][0], outline[0][1]);
    for (const [x, y] of outline.slice(1)) shape.lineTo(x, y);
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, [shedWidth, roofLowerPitch, roofUpperPitch]);

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

  const peakY = useMemo(
    () => gambrelEndOutline(shedWidth, roofLowerPitch, roofUpperPitch)
      .reduce((hi, p) => Math.max(hi, p[1]), -Infinity),
    [shedWidth, roofLowerPitch, roofUpperPitch]
  );

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

      {showOctagonWindow && (
        <group
          position={[
            0,
            wallHeight + peakY * 0.45,
            posZ + (side === 'front' ? 0.08 : -0.08),
          ]}
        >
          <OctagonWindow trimColor={trimColor} />
        </group>
      )}
    </group>
  );
};
