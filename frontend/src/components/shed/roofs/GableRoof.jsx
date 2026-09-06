import { useMemo } from 'react';
import * as THREE from 'three';
import { makeRoofShader } from '../../../utils/shaders';
import { gableRoofProfile, roofSlabDepth, ROOF_THICKNESS } from '../../../utils/roofGeometry';
import { roofMetal } from '../../../utils/trimGeometry';
import { ExtrudedBand } from '../../common/ExtrudedBand';
import { ridgeMaterial } from '../extras/skylightMaterial';

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

  const METAL_MAT = {
    color: roofColor,
    roughness: roofMaterial === 'metal' ? 0.35 : 0.7,
    metalness: roofMaterial === 'metal' ? 0.4 : 0.05,
  };

  // The roof's own metalwork, in the roof colour rather than with the trim.
  // The ridge cap runs the length of the shed and is a box; the J-channel
  // follows the gable-end edge, so it is a mitred outline like the fascia
  // under it and is extruded rather than boxed. That is the `parts` /
  // `boards` split, and it is the only thing this file still decides about
  // them — which pieces a Gable's roof carries is part of the Model bundle,
  // and is asked for rather than listed here and in three other components.
  //
  // The skylight is part of the same answer, not a part laid over it: the cap
  // breaks either side of the glass and the glass fills exactly the run the
  // metal gave up, so the two cannot drift (issue #42).
  const { parts: ridgeCap, boards: jChannel } = useMemo(
    () =>
      roofMetal('Gable', shedWidth, shedLength, wallHeight, {
        skylightFt: skylight?.enabled ? (skylight.runningFt ?? 8) : 0,
      }),
    [shedWidth, shedLength, wallHeight, skylight]
  );

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

      {ridgeCap.map(({ id, kind, position, size, rotation }) => (
        <mesh key={id} position={position} rotation={rotation} castShadow={kind !== 'glass'}>
          <boxGeometry args={size} />
          <meshStandardMaterial {...ridgeMaterial(kind, METAL_MAT)} />
        </mesh>
      ))}

      {/* `depth` renamed: the slab's own `depth` is already in scope here */}
      {jChannel.map(({ id, outline, position, depth: bandDepth }) => (
        <ExtrudedBand key={id} outline={outline} position={position} depth={bandDepth}>
          <meshStandardMaterial {...METAL_MAT} />
        </ExtrudedBand>
      ))}
    </group>
  );
};
