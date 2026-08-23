import { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { makeSidingShader, makeRoofShader } from '../../../utils/shaders';
import { Skylight } from '../extras/Skylight';

/**
 * GambrelRoof — independently renderable gambrel (barn-style) roof.
 *
 * Two ExtrudeGeometry meshes: lower trapezoid (steep) + upper triangle (gentle).
 * Each mesh uses THREE material groups:
 *   Group 0 — front end-cap  → siding material (barn gable, back of shed)
 *   Group 1 — back end-cap   → siding material (barn gable, front of shed)
 *   Group 2 — slope faces    → roof material (metal or shingle)
 *
 * The end-caps cover only the ROOF profile (Y=wallHeight upward).
 * Two separate wall panels (barnWallFront/Back) cover the rectangular
 * gable area from floor (Y=0) to eave (Y=wallHeight), positioned 0.01 ft
 * proud of the end-caps so there is no Z-fighting between them.
 *
 * BarnShed renders only left/right ShedWalls; these panels + end-caps
 * together form the complete front/back gable faces.
 */

const KNUCKLE_X_RATIO = 0.82;

export const GambrelRoof = ({
  shedWidth,
  shedLength,
  wallHeight,
  roofLowerPitch = 5,
  roofUpperPitch = 10,
  roofColor,
  roofMaterial,
  color,         // siding color for gable end-caps
  sidingTexture, // 'T1-11' | 'smooth' for gable end-caps
  overhangEave = 0.5,
  skylight = null,
  castShadow = true,
  receiveShadow = true,
}) => {
  const halfWidth = shedWidth / 2;

  const knuckleX = halfWidth * KNUCKLE_X_RATIO;
  // Rise is calculated from the full eave-to-knuckle run (including overhang)
  // so the visual slope angle matches the specified pitch ratio.
  const knuckleY = (halfWidth + overhangEave - knuckleX) * (roofLowerPitch / 12);
  const peakY    = knuckleY + knuckleX * (roofUpperPitch / 12);

  const lowerShape = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-(halfWidth + overhangEave), 0);
    shape.lineTo(halfWidth + overhangEave, 0);
    shape.lineTo(knuckleX, knuckleY);
    shape.lineTo(-knuckleX, knuckleY);
    shape.closePath();
    return shape;
  }, [halfWidth, overhangEave, knuckleX, knuckleY]);

  const upperShape = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-knuckleX, knuckleY);
    shape.lineTo(knuckleX, knuckleY);
    shape.lineTo(0, peakY);
    shape.closePath();
    return shape;
  }, [knuckleX, knuckleY, peakY]);

  const extrudeSettings = useMemo(
    () => ({ depth: shedLength, bevelEnabled: false }),
    [shedLength]
  );

  // End-cap faces (groups 0 & 1) use siding shader so barn gable faces match the walls.
  // Slope faces (group 2) use roof shader.
  const sidingMat = useMemo(() => {
    const mat = new THREE.ShaderMaterial(makeSidingShader(color, sidingTexture));
    mat.side = THREE.DoubleSide;
    return mat;
  }, [color, sidingTexture]);

  const roofMat = useMemo(() => {
    const mat = new THREE.ShaderMaterial(makeRoofShader(roofColor, roofMaterial));
    mat.side = THREE.DoubleSide;
    return mat;
  }, [roofColor, roofMaterial]);

  useEffect(() => () => { sidingMat.dispose(); }, [sidingMat]);
  useEffect(() => () => { roofMat.dispose(); }, [roofMat]);

  // [front-cap, back-cap, slopes] — matches ExtrudeGeometry group indices
  const materials = useMemo(
    () => [sidingMat, sidingMat, roofMat],
    [sidingMat, roofMat]
  );

  const pos = [0, wallHeight, -shedLength / 2];

  // Peak in world space: wallHeight + peakY (peakY is relative to wallHeight base)
  const worldPeakY = wallHeight + peakY;

  // Front/back wall panel dimensions — covers rectangular gable from floor to eave
  const halfLen = shedLength / 2;
  const WALL_PANEL_OFFSET = 0.01; // ft proud of end-caps to prevent Z-fighting

  return (
    <group name="gambrelRoof">
      {/* Roof slope sections — end-caps cover gable profile above wallHeight */}
      <mesh name="gambrelRoofLower" position={pos} castShadow={castShadow} receiveShadow={receiveShadow}>
        <extrudeGeometry args={[lowerShape, extrudeSettings]} />
        <primitive object={materials} attach="material" />
      </mesh>
      <mesh name="gambrelRoofUpper" position={pos} castShadow={castShadow} receiveShadow={receiveShadow}>
        <extrudeGeometry args={[upperShape, extrudeSettings]} />
        <primitive object={materials} attach="material" />
      </mesh>

      {/* Front barn wall face — rectangular panel from floor to eave */}
      <mesh
        name="barnWallFront"
        position={[0, wallHeight / 2, halfLen + WALL_PANEL_OFFSET]}
        castShadow={castShadow}
        receiveShadow={receiveShadow}
      >
        <boxGeometry args={[shedWidth, wallHeight, 0.01]} />
        <primitive object={sidingMat} attach="material" />
      </mesh>

      {/* Back barn wall face — rectangular panel from floor to eave */}
      <mesh
        name="barnWallBack"
        position={[0, wallHeight / 2, -(halfLen + WALL_PANEL_OFFSET)]}
        castShadow={castShadow}
        receiveShadow={receiveShadow}
      >
        <boxGeometry args={[shedWidth, wallHeight, 0.01]} />
        <primitive object={sidingMat} attach="material" />
      </mesh>

      {skylight?.enabled && (
        <group position={[0, worldPeakY + 0.02, 0]}>
          <Skylight runningFt={skylight.runningFt ?? 8} />
        </group>
      )}
    </group>
  );
};
