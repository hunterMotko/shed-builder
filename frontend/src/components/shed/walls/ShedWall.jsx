import { useMemo, useEffect, forwardRef } from 'react';
import * as THREE from 'three';
import { cutOpenings, wallSpan, WALL_THICKNESS } from '../../../utils/wallOpenings';
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
  const shuttersEnabled = useShedStore((s) => s.options.shutters.enabled);

  const halfW = shedWidth / 2;
  const halfL = shedLength / 2;
  const tHalf = WALL_THICKNESS / 2;

  // Front/back span full shed width; left/right fit between the front/back inner faces.
  const localGeomWidth = wallSpan(side, shedWidth, shedLength);

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

  // CSG — cut openings in local wall coordinate space (ADR-0001).
  // Derived from the Placements, so it is a memo rather than effect-and-state:
  // the cut geometry is not something that arrives later, it is what this wall
  // *is* for a given Design.
  const modifiedGeometry = useMemo(() => {
    try {
      return cutOpenings(baseGeometry, placements, {
        localGeomWidth,
        wallHeight,
        wallThickness: WALL_THICKNESS,
      });
    } catch (err) {
      // A wall that renders solid is wrong but recoverable; a wall that throws
      // takes the whole canvas down with it.
      console.error(`ShedWall CSG failed (${side}):`, err);
      return null;
    }
  }, [placements, baseGeometry, localGeomWidth, wallHeight, side]);

  // The cut geometry reaches the mesh through <primitive>, which R3F never
  // disposes, so this wall owns its lifetime.
  useEffect(() => () => modifiedGeometry?.dispose(), [modifiedGeometry]);

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
