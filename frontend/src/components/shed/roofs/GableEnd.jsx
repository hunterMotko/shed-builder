import { useMemo } from 'react';
import * as THREE from 'three';
import { makeSidingShader } from '../../../utils/shaders';
import { OctagonWindow } from '../openings/OctagonWindow';

/**
 * GableEnd — independently renderable triangular gable end panel.
 * Rendered with siding shader to match the walls.
 * Placed at the front or back of the shed at the roofline.
 */
export const GableEnd = ({
  side,
  shedWidth,
  shedLength,
  wallHeight,
  roofHeight = 4,
  color,
  sidingTexture,
  showOctagonWindow = false,
  trimColor = '#654321',
  castShadow = true,
  receiveShadow = true,
}) => {
  const halfWidth  = shedWidth / 2;
  const halfLength = shedLength / 2;

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      -halfWidth, 0, 0,   // bottom-left
       halfWidth, 0, 0,   // bottom-right
       0, roofHeight, 0,  // peak
    ]);
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geo.setIndex(new THREE.BufferAttribute(new Uint32Array([0, 1, 2]), 1));
    geo.computeVertexNormals();
    return geo;
  }, [halfWidth, roofHeight]);

  const sidingShader = useMemo(
    () => makeSidingShader(color, sidingTexture),
    [color, sidingTexture]
  );

  // Push the triangle 0.01 ft proud of the wall outer face to prevent Z-fighting.
  // The front wall face is at exactly Z = halfLength (wall center + WALL_THICKNESS/2,
  // from utils/wallOpenings.js).
  const EPSILON = 0.01;
  const posZ = side === 'front' ? halfLength + EPSILON : -(halfLength + EPSILON);

  // Octagon window sits at ~45% up the triangle height, centered horizontally
  const octWindowY = roofHeight * 0.45;
  const OCTAGON_Z_OFFSET = 0.08; // proud of triangle surface

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

      {showOctagonWindow && (
        <group position={[0, wallHeight + octWindowY, posZ + (side === 'front' ? OCTAGON_Z_OFFSET : -OCTAGON_Z_OFFSET)]}>
          <OctagonWindow trimColor={trimColor} />
        </group>
      )}
    </group>
  );
};
