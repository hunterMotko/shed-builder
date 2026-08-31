import { useMemo } from 'react';
import * as THREE from 'three';
import { makeRoofShader } from '../../../utils/shaders';
import {
  gambrelRoofProfile,
  roofSlabDepth,
  ROOF_THICKNESS,
  GAMBREL_LOWER_PITCH,
  GAMBREL_UPPER_PITCH,
} from '../../../utils/roofGeometry';
import { Skylight } from '../extras/Skylight';
import { barnKnuckleFlashing, roofRidgeCap, rakeJChannel } from '../../../utils/trimGeometry';
import { gambrelEndOutline, gambrelRoofTopLine } from '../../../utils/roofGeometry';
import { ExtrudedBand } from '../../common/ExtrudedBand';

/**
 * GambrelRoof — the barn roof, as a slab.
 *
 * It used to be two *filled* prisms — a steep lower trapezoid and a shallow
 * upper triangle — extruded exactly the length of the shed. That shape had no
 * thickness, no fascia and no rake overhang, and it borrowed its own end caps
 * to stand in for the barn's gable siding, drawing them with the siding shader.
 *
 * One slab replaces both prisms, so there are no caps to borrow: the barn's end
 * faces are now `BarnEnd`, a real piece of siding (ADR-0010 unchanged — the
 * walls below the eave were already real walls).
 *
 * The eave datum is the wall, not the tip of the overhang. Measuring from the
 * overhang put a 12 ft Barn's ridge 10 inches above the Peak Height quoted on
 * screen, because `modelSpec.roofRiseFt` has always measured from the wall.
 */
export const GambrelRoof = ({
  shedWidth,
  shedLength,
  wallHeight,
  roofLowerPitch = GAMBREL_LOWER_PITCH,
  roofUpperPitch = GAMBREL_UPPER_PITCH,
  roofColor,
  roofMaterial,
  overhang = 2 / 12,
  skylight = null,
  castShadow = true,
  receiveShadow = true,
}) => {
  const roofShape = useMemo(() => {
    const shape = new THREE.Shape();
    const points = gambrelRoofProfile(shedWidth, roofLowerPitch, roofUpperPitch, {
      overhang,
      thickness: ROOF_THICKNESS,
    });
    shape.moveTo(points[0][0], points[0][1]);
    for (const [x, y] of points.slice(1)) shape.lineTo(x, y);
    shape.closePath();
    return shape;
  }, [shedWidth, roofLowerPitch, roofUpperPitch, overhang]);

  const depth = roofSlabDepth(shedLength, overhang);

  const extrudeSettings = useMemo(
    () => ({ depth, bevelEnabled: false }),
    [depth]
  );

  const roofShader = useMemo(
    () => makeRoofShader(roofColor, roofMaterial),
    [roofColor, roofMaterial]
  );

  // The roof's own metalwork, in the roof colour rather than with the trim.
  // Break flashing over each Knuckle and the ridge cap both run the length of
  // the shed and are boxes; the J-channel follows the gable-end edge, so it is
  // a mitred outline like the fly under it and is extruded rather than boxed.
  const metalwork = useMemo(() => {
    const topLine = gambrelRoofTopLine(shedWidth, roofLowerPitch, roofUpperPitch, { overhang });
    const peak = topLine.reduce((hi, p) => Math.max(hi, p[1]), -Infinity);
    return [
      ...barnKnuckleFlashing(
        gambrelEndOutline(shedWidth, roofLowerPitch, roofUpperPitch),
        shedLength,
        wallHeight,
        { overhang }
      ),
      ...roofRidgeCap(peak, roofUpperPitch / 12, shedLength, wallHeight, { overhang }),
    ];
  }, [shedWidth, shedLength, wallHeight, roofLowerPitch, roofUpperPitch, overhang]);

  const jChannel = useMemo(
    () =>
      rakeJChannel(
        gambrelRoofTopLine(shedWidth, roofLowerPitch, roofUpperPitch, { overhang }),
        shedLength,
        wallHeight,
        { overhang }
      ),
    [shedWidth, shedLength, wallHeight, roofLowerPitch, roofUpperPitch, overhang]
  );

  // Highest point of the profile, for anything that sits on the ridge.
  const peakY = useMemo(() => {
    const points = gambrelRoofProfile(shedWidth, roofLowerPitch, roofUpperPitch, {
      overhang,
      thickness: ROOF_THICKNESS,
    });
    return points.reduce((hi, p) => Math.max(hi, p[1]), -Infinity);
  }, [shedWidth, roofLowerPitch, roofUpperPitch, overhang]);

  const METAL_MAT = {
    color: roofColor,
    roughness: roofMaterial === 'metal' ? 0.35 : 0.7,
    metalness: roofMaterial === 'metal' ? 0.4 : 0.05,
  };

  return (
    <group name="gambrelRoof">
      <mesh
        name="gambrelRoofMesh"
        position={[0, wallHeight, -depth / 2]}
        castShadow={castShadow}
        receiveShadow={receiveShadow}
      >
        <extrudeGeometry args={[roofShape, extrudeSettings]} />
        <shaderMaterial args={[roofShader]} side={THREE.DoubleSide} />
      </mesh>

      {metalwork.map(({ id, position, size, rotation }) => (
        <mesh key={id} position={position} rotation={rotation} castShadow>
          <boxGeometry args={size} />
          <meshStandardMaterial {...METAL_MAT} />
        </mesh>
      ))}

      {/* `depth` renamed: the slab's own `depth` is already in scope here */}
      {jChannel.map(({ id, outline, position, depth: bandDepth }) => (
        <ExtrudedBand key={id} outline={outline} position={position} depth={bandDepth}>
          <meshStandardMaterial {...METAL_MAT} />
        </ExtrudedBand>
      ))}

      {skylight?.enabled && (
        <group position={[0, wallHeight + peakY + 0.02, 0]}>
          <Skylight runningFt={skylight.runningFt ?? 8} />
        </group>
      )}
    </group>
  );
};
