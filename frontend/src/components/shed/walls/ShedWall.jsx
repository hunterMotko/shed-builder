import { useMemo, useEffect, useState, forwardRef } from 'react';
import * as THREE from 'three';
import { Evaluator, SUBTRACTION } from 'three-bvh-csg';
import { makeSidingShader } from '../../../utils/shaders';
import { useShedStore } from '../../../store/shedStore';
import { DoorFrame } from '../../common/DoorFrame';
import { WindowFrame } from '../../common/WindowFrame';
import { DoorObject } from '../../common/DoorObject';
import { WindowObject } from '../../common/WindowObject';
import { GarageDoor } from '../openings/GarageDoor';
import { SwingBarnDoor } from '../openings/SwingBarnDoor';
import { Shutters } from '../extras/Shutters';

/**
 * Wall thickness in feet (6 inches).
 * Exported so GableEnd / roof components can align their positions correctly.
 */
export const WALL_THICKNESS = 0.5;

// One shared Evaluator instance — CSG is sequential so no concurrency issue.
const evaluator = new Evaluator();

/**
 * ShedWall — independently renderable individual wall section.
 *
 * Handles its own CSG for door/window openings and renders all associated
 * frame/object components for placements on this wall.
 *
 * World-space position math:
 *   front  — BoxGeometry(shedWidth, wallHeight, T) at [0, h/2, halfL - T/2]
 *   back   — BoxGeometry(shedWidth, wallHeight, T) at [0, h/2, -(halfL - T/2)]
 *   left   — BoxGeometry(shedLength-2T, wallHeight, T) rotated [0,-π/2,0] at [-(halfW-T/2), h/2, 0]
 *   right  — BoxGeometry(shedLength-2T, wallHeight, T) rotated [0,-π/2,0] at [halfW-T/2, h/2, 0]
 *
 * Left/right use rotation [0,-π/2,0] so that:
 *   - local X (the wall's width axis) maps to world Z  ← aligns normalizedX with DoorObject Z formula
 *   - outer face normal faces outward                  ← correct for DoubleSide lighting
 */
export const ShedWall = forwardRef(function ShedWall(
  {
    side,
    shedWidth,
    shedLength,
    wallHeight,
    color,
    sidingTexture,
    trimColor,
    trimWidth = 0.25,
    doorStyle = 'sectional',
    placements = [],
    castShadow = true,
    receiveShadow = true,
  },
  ref
) {
  const [modifiedGeometry, setModifiedGeometry] = useState(null);
  const shuttersEnabled = useShedStore((s) => s.addOns.shutters.enabled);

  const halfW = shedWidth / 2;
  const halfL = shedLength / 2;
  const tHalf = WALL_THICKNESS / 2;

  // Front/back span full shed width; left/right fit between the front/back inner faces.
  const localGeomWidth = (side === 'front' || side === 'back')
    ? shedWidth
    : shedLength - WALL_THICKNESS * 2;

  const baseGeometry = useMemo(
    () => new THREE.BoxGeometry(localGeomWidth, wallHeight, WALL_THICKNESS),
    [localGeomWidth, wallHeight]
  );

  // World position + rotation for this wall side
  const [position, rotation] = useMemo(() => {
    switch (side) {
      case 'front': return [[0, wallHeight / 2, halfL - tHalf], [0, 0, 0]];
      case 'back':  return [[0, wallHeight / 2, -(halfL - tHalf)], [0, 0, 0]];
      case 'left':  return [[-(halfW - tHalf), wallHeight / 2, 0], [0, -Math.PI / 2, 0]];
      case 'right': return [[halfW - tHalf, wallHeight / 2, 0], [0, -Math.PI / 2, 0]];
      default:      return [[0, wallHeight / 2, 0], [0, 0, 0]];
    }
  }, [side, wallHeight, halfW, halfL, tHalf]);

  // CSG — cut openings in local wall coordinate space
  useEffect(() => {
    if (placements.length === 0) {
      setModifiedGeometry(null);
      return;
    }

    const toDispose = [];
    let finalGeometry = null;

    try {
      const cloned = baseGeometry.clone();
      toDispose.push(cloned);
      let currentMesh = new THREE.Mesh(cloned);
      currentMesh.updateMatrixWorld(true);

      for (const p of placements) {
        // Door/window center in the wall's local XY plane
        const localX = -localGeomWidth / 2 + p.normalizedX * localGeomWidth;
        const localY = -wallHeight / 2 + p.normalizedY * wallHeight;

        const cutGeo = new THREE.BoxGeometry(p.width, p.height, WALL_THICKNESS + 0.1);
        const cutMat = new THREE.MeshBasicMaterial();
        const cutMesh = new THREE.Mesh(cutGeo, cutMat);
        cutMesh.position.set(localX, localY, 0);
        cutMesh.updateMatrixWorld();
        currentMesh.updateMatrixWorld();

        const prev = currentMesh;
        currentMesh = evaluator.evaluate(currentMesh, cutMesh, SUBTRACTION);

        // Dispose intermediates (but not baseGeometry — it belongs to the useMemo)
        if (prev.geometry !== cloned) toDispose.push(prev.geometry);
        toDispose.push(cutGeo, cutMat);
      }

      finalGeometry = currentMesh.geometry;
      setModifiedGeometry(finalGeometry);
    } catch (err) {
      console.error(`ShedWall CSG failed (${side}):`, err);
      setModifiedGeometry(null);
    } finally {
      toDispose.forEach((obj) => obj.dispose?.());
    }

    return () => {
      finalGeometry?.dispose();
    };
  }, [placements, baseGeometry, localGeomWidth, wallHeight, side]);

  const sidingShader = useMemo(
    () => makeSidingShader(color, sidingTexture),
    [color, sidingTexture]
  );

  // Passed to frame/object children — world-space positioning unchanged from original system
  const shedDimensions = useMemo(
    () => ({ width: shedWidth, length: shedLength, wallHeight }),
    [shedWidth, shedLength, wallHeight]
  );

  return (
    <group name={`wallGroup-${side}`}>
      {/* Wall slab mesh */}
      <mesh
        ref={ref}
        name={`wall-${side}`}
        position={position}
        rotation={rotation}
        castShadow={castShadow}
        receiveShadow={receiveShadow}
      >
        <primitive object={modifiedGeometry ?? baseGeometry} attach="geometry" />
        <shaderMaterial args={[sidingShader]} side={THREE.DoubleSide} />
      </mesh>

      {/* Door & window frames */}
      {placements.map((p) => {
        if (p.type === 'door' || p.type === 'garage_door' || p.type === 'barn_door') {
          return (
            <DoorFrame
              key={`frame-${p.id}`}
              placement={p}
              shedDimensions={shedDimensions}
              trimColor={trimColor}
              trimWidth={trimWidth}
            />
          );
        }
        if (p.type === 'window') {
          return (
            <WindowFrame
              key={`frame-${p.id}`}
              placement={p}
              shedDimensions={shedDimensions}
              trimColor={trimColor}
              trimWidth={trimWidth}
            />
          );
        }
        return null;
      })}

      {/* Door & window objects */}
      {placements.map((p) => {
        if (p.type === 'door') {
          return (
            <DoorObject
              key={p.id}
              placement={p}
              shedDimensions={shedDimensions}
              trimColor={trimColor}
              wallColor={color}
            />
          );
        }
        if (p.type === 'window') {
          return (
            <WindowObject
              key={p.id}
              placement={p}
              shedDimensions={shedDimensions}
              trimColor={trimColor}
              frameColor={trimColor}
            />
          );
        }
        if (p.type === 'garage_door') {
          return (
            <GarageDoor
              key={p.id}
              placement={p}
              shedDimensions={shedDimensions}
              trimColor={trimColor}
              doorStyle={doorStyle}
            />
          );
        }
        if (p.type === 'barn_door' || p.type === 'swing_barn_door') {
          return (
            <SwingBarnDoor
              key={p.id}
              placement={p}
              shedDimensions={shedDimensions}
              trimColor={trimColor}
              wallColor={color}
            />
          );
        }
        return null;
      })}

      {/* Vinyl shutters — render alongside every window when shutters add-on is enabled */}
      {shuttersEnabled && placements
        .filter((p) => p.type === 'window')
        .map((p) => (
          <Shutters
            key={`shutters-${p.id}`}
            placement={p}
            shedDimensions={shedDimensions}
          />
        ))
      }
    </group>
  );
});
