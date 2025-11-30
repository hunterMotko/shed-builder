import React, { useMemo } from 'react';
import * as THREE from 'three';

/**
 * Ultra-refined door with trim frame, recessed panel, and hardware detail
 * Implements professional construction detailing
 */
export const DoorObject = ({
  placement,
  shedDimensions,
  trimColor = '#654321',
  wallColor = '#8B4513',
}) => {
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
          halfLength + 0.3
        );
        break;
      case 'back':
        pos = new THREE.Vector3(
          -halfWidth + normalizedX * width,
          -wallHeight / 2 + normalizedY * wallHeight,
          -halfLength - 0.3
        );
        break;
      case 'left':
        pos = new THREE.Vector3(
          -halfWidth - 0.3,
          -wallHeight / 2 + normalizedY * wallHeight,
          -halfLength + normalizedX * length
        );
        break;
      case 'right':
        pos = new THREE.Vector3(
          halfWidth + 0.3,
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

  return (
    <group position={position} rotation={rotation}>
      {/* ===== OUTER DOOR SLAB (Trim Color) ===== */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[elemWidth - 0.05, elemHeight - 0.05, 0.05]} />
        <meshStandardMaterial
          color={trimColor}
          roughness={0.35}
          metalness={0.2}
        />
      </mesh>

      {/* ===== RECESSED PANEL AREA ===== */}
      {/* Main recessed panel - uses wall color for contrast */}
      <mesh position={[0, 0, 0.08]} castShadow receiveShadow>
        <boxGeometry args={[elemWidth - 0.15, elemHeight - 0.15, 0.06]} />
        <meshStandardMaterial color={wallColor} roughness={0.5} />
      </mesh>

      {/* Upper panel detail - simulates 6-panel door */}
      <mesh position={[0, elemHeight / 2 - 0.4, 0.12]} castShadow>
        <boxGeometry args={[elemWidth - 0.25, elemHeight / 2 - 0.5, 0.02]} />
        <meshStandardMaterial
          color={wallColor}
          roughness={0.6}
          metalness={0.05}
        />
      </mesh>

      {/* Lower panel detail */}
      <mesh position={[0, -elemHeight / 2 + 0.4, 0.12]} castShadow>
        <boxGeometry args={[elemWidth - 0.25, elemHeight / 2 - 0.5, 0.02]} />
        <meshStandardMaterial
          color={wallColor}
          roughness={0.6}
          metalness={0.05}
        />
      </mesh>

      {/* Vertical center stile */}
      <mesh position={[0, 0, 0.13]} castShadow>
        <boxGeometry args={[0.06, elemHeight - 0.3, 0.015]} />
        <meshStandardMaterial
          color={wallColor}
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>

      {/* ===== HARDWARE ===== */}

      {/* Door Handle - Lever style */}
      <mesh position={[elemWidth / 2 - 0.25, 0, 0.16]} castShadow>
        <boxGeometry args={[0.12, 0.04, 0.04]} />
        <meshStandardMaterial color="#B8860B" metalness={0.8} roughness={0.15} />
      </mesh>

      {/* Handle mechanism detail */}
      <mesh position={[elemWidth / 2 - 0.35, 0, 0.15]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 0.08, 16]} />
        <meshStandardMaterial color="#888888" metalness={0.7} roughness={0.25} />
      </mesh>

      {/* Top Hinge */}
      <mesh position={[-elemWidth / 2 - 0.1, elemHeight / 2 - 0.2, 0.1]} castShadow>
        <boxGeometry args={[0.05, 0.08, 0.06]} />
        <meshStandardMaterial color="#696969" metalness={0.75} roughness={0.3} />
      </mesh>

      {/* Middle Hinge */}
      <mesh position={[-elemWidth / 2 - 0.1, 0, 0.1]} castShadow>
        <boxGeometry args={[0.05, 0.08, 0.06]} />
        <meshStandardMaterial color="#696969" metalness={0.75} roughness={0.3} />
      </mesh>

      {/* Bottom Hinge */}
      <mesh position={[-elemWidth / 2 - 0.1, -elemHeight / 2 + 0.2, 0.1]} castShadow>
        <boxGeometry args={[0.05, 0.08, 0.06]} />
        <meshStandardMaterial color="#696969" metalness={0.75} roughness={0.3} />
      </mesh>

      {/* Door Frame - slight recess for depth */}
      <mesh position={[0, 0, -0.02]}>
        <boxGeometry args={[elemWidth + 0.08, elemHeight + 0.08, 0.02]} />
        <meshStandardMaterial color={trimColor} roughness={0.4} metalness={0.2} />
      </mesh>
    </group>
  );
};
