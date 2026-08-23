import { useMemo } from 'react';
import * as THREE from 'three';
import { makeRoofShader } from '../../../utils/shaders';
import { Skylight } from '../extras/Skylight';

/**
 * GableRoof — independently renderable gable (triangular-pitch) roof.
 * Accepts shed dimensions + appearance props; renders one ExtrudeGeometry mesh.
 * Optionally renders a ridge Skylight when skylight.enabled is true.
 */
export const GableRoof = ({
  shedWidth,
  shedLength,
  wallHeight,
  roofHeight = 4,
  roofColor,
  roofMaterial,
  overhangEave = 0.5,
  skylight = null,
  castShadow = true,
  receiveShadow = true,
}) => {
  const halfWidth = shedWidth / 2;

  const roofShape = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-(halfWidth + overhangEave), 0);
    shape.lineTo(halfWidth + overhangEave, 0);
    shape.lineTo(0, roofHeight);
    shape.closePath();
    return shape;
  }, [halfWidth, overhangEave, roofHeight]);

  const extrudeSettings = useMemo(
    () => ({ depth: shedLength, bevelEnabled: false }),
    [shedLength]
  );

  const roofShader = useMemo(
    () => makeRoofShader(roofColor, roofMaterial),
    [roofColor, roofMaterial]
  );

  // Peak position in world space: [0, wallHeight + roofHeight, 0]
  const peakY = wallHeight + roofHeight;

  return (
    <group name="gableRoof">
      <mesh
        name="gableRoofMesh"
        position={[0, wallHeight, -shedLength / 2]}
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
