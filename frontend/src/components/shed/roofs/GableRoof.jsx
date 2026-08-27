import { useMemo } from 'react';
import * as THREE from 'three';
import { makeRoofShader } from '../../../utils/shaders';
import { gableRoofProfile, roofSlabDepth, ROOF_THICKNESS } from '../../../utils/roofGeometry';
import { Skylight } from '../extras/Skylight';

/**
 * GableRoof — the gable roof, as a slab.
 *
 * It used to be a *filled* triangle extruded exactly the length of the shed: a
 * solid wedge with no thickness, no fascia and no rake overhang, whose end caps
 * doubled the `GableEnd` siding they sat behind. It is now a plane with
 * thickness, run past both gable ends by the overhang, so the end cap is the
 * fascia and there is an edge for trim to hang on.
 *
 * `roofHeight` is the rise at the **wall**, which is what the Peak Height on
 * screen quotes. The profile spreads it correctly: the old shape put the same
 * rise over half a width *plus* the overhang and rendered an effective 5.54:12
 * where the spec says 6:12.
 */
export const GableRoof = ({
  shedWidth,
  shedLength,
  wallHeight,
  roofHeight = 4,
  roofColor,
  roofMaterial,
  overhang = 0.5,
  skylight = null,
  castShadow = true,
  receiveShadow = true,
}) => {
  // The profile is stated as a pitch, so recover it from the rise the shed
  // passed down rather than reaching for the constant — a target Design may
  // legitimately hand us a different roof.
  const pitchX = (roofHeight / (shedWidth / 2)) * 12;

  const roofShape = useMemo(() => {
    const shape = new THREE.Shape();
    const points = gableRoofProfile(shedWidth, pitchX, {
      overhang,
      thickness: ROOF_THICKNESS,
    });
    shape.moveTo(points[0][0], points[0][1]);
    for (const [x, y] of points.slice(1)) shape.lineTo(x, y);
    shape.closePath();
    return shape;
  }, [shedWidth, pitchX, overhang]);

  const depth = roofSlabDepth(shedLength, overhang);

  const extrudeSettings = useMemo(
    () => ({ depth, bevelEnabled: false }),
    [depth]
  );

  const roofShader = useMemo(
    () => makeRoofShader(roofColor, roofMaterial),
    [roofColor, roofMaterial]
  );

  const peakY = wallHeight + roofHeight;

  return (
    <group name="gableRoof">
      <mesh
        name="gableRoofMesh"
        position={[0, wallHeight, -depth / 2]}
        castShadow={castShadow}
        receiveShadow={receiveShadow}
      >
        <extrudeGeometry args={[roofShape, extrudeSettings]} />
        <shaderMaterial args={[roofShader]} side={THREE.DoubleSide} />
      </mesh>

      {skylight?.enabled && (
        <group position={[0, peakY + 0.02, 0]}>
          <Skylight runningFt={skylight.runningFt ?? 8} />
        </group>
      )}
    </group>
  );
};
