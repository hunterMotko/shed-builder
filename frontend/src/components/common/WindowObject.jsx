import React, { useMemo } from 'react';
import * as THREE from 'three';

/**
 * Renders a window frame and panes at a placement location
 */
export const WindowObject = ({ placement, shedDimensions, trimColor = '#654321', frameColor = '#8B7355' }) => {
  const {
    width: elemWidth,
    height: elemHeight,
    normalizedX,
    normalizedY,
    wall,
  } = placement;

  const { width, length, wallHeight } = shedDimensions;
  const halfWidth = width / 2;
  const halfLength = length / 2;

  // Calculate world position
  const position = useMemo(() => {
    let pos;
    switch (wall) {
      case 'front':
        pos = new THREE.Vector3(
          -halfWidth + normalizedX * width,
          -wallHeight / 2 + normalizedY * wallHeight,
          halfLength + 0.25
        );
        break;
      case 'back':
        pos = new THREE.Vector3(
          -halfWidth + normalizedX * width,
          -wallHeight / 2 + normalizedY * wallHeight,
          -halfLength - 0.25
        );
        break;
      case 'left':
        pos = new THREE.Vector3(
          -halfWidth - 0.25,
          -wallHeight / 2 + normalizedY * wallHeight,
          -halfLength + normalizedX * length
        );
        break;
      case 'right':
        pos = new THREE.Vector3(
          halfWidth + 0.25,
          -wallHeight / 2 + normalizedY * wallHeight,
          -halfLength + normalizedX * length
        );
        break;
      default:
        pos = new THREE.Vector3(0, 0, 0);
    }
    return pos;
  }, [normalizedX, normalizedY, wall, width, length, wallHeight, halfWidth, halfLength]);

  // Calculate rotation for side walls
  const rotation = useMemo(() => {
    switch (wall) {
      case 'left':
        return [0, Math.PI / 2, 0];
      case 'right':
        return [0, -Math.PI / 2, 0];
      default:
        return [0, 0, 0];
    }
  }, [wall]);

  // Calculate grid for window panes
  const gridX = Math.max(2, Math.ceil(elemWidth / 2));
  const gridY = Math.max(2, Math.ceil(elemHeight / 2));

  return (
    <group position={position} rotation={rotation}>
      {/* Window Trim Frame - outermost trim (using trimColor) */}
      <mesh position={[0, 0, -0.05]}>
        <boxGeometry args={[elemWidth + 0.2, elemHeight + 0.2, 0.08]} />
        <meshStandardMaterial color={trimColor} roughness={0.6} metalness={0.15} />
      </mesh>

      {/* Window Frame - wooden frame */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[elemWidth + 0.1, elemHeight + 0.1, 0.04]} />
        <meshStandardMaterial color={frameColor} roughness={0.6} />
      </mesh>

      {/* Window Sill - bottom detail */}
      <mesh position={[0, -elemHeight / 2 - 0.08, 0.05]}>
        <boxGeometry args={[elemWidth + 0.15, 0.08, 0.08]} />
        <meshStandardMaterial color="#A0826D" roughness={0.7} />
      </mesh>

      {/* Window Glass */}
      <mesh position={[0, 0, 0.03]}>
        <boxGeometry args={[elemWidth - 0.05, elemHeight - 0.05, 0.01]} />
        <meshStandardMaterial
          color="#87CEEB"
          transparent={true}
          opacity={0.6}
          side={THREE.DoubleSide}
          roughness={0.1}
        />
      </mesh>

      {/* Horizontal Muntins (horizontal dividers) */}
      {Array.from({ length: gridY - 1 }).map((_, i) => {
        const yPos = -elemHeight / 2 + (i + 1) * (elemHeight / gridY);
        return (
          <mesh key={`h-muntin-${i}`} position={[0, yPos, 0.04]}>
            <boxGeometry args={[elemWidth, 0.04, 0.025]} />
            <meshStandardMaterial color={trimColor} roughness={0.6} />
          </mesh>
        );
      })}

      {/* Vertical Muntins (vertical dividers) */}
      {Array.from({ length: gridX - 1 }).map((_, i) => {
        const xPos = -elemWidth / 2 + (i + 1) * (elemWidth / gridX);
        return (
          <mesh key={`v-muntin-${i}`} position={[xPos, 0, 0.04]}>
            <boxGeometry args={[0.04, elemHeight, 0.025]} />
            <meshStandardMaterial color={trimColor} roughness={0.6} />
          </mesh>
        );
      })}
    </group>
  );
};
