import React, { useMemo } from 'react';
import * as THREE from 'three';
import { openingTransform } from '../../utils/wallOpenings';

/**
 * Renders a window frame and panes at a placement location
 */
export const WindowObject = ({ placement, shedDimensions, trimColor = '#654321', frameColor = '#8B7355' }) => {
  const { width: elemWidth, height: elemHeight } = placement;

  // Window sits 0.25 ft proud of the wall face.
  const { position, rotation } = useMemo(
    () => openingTransform(placement, shedDimensions, 0.25),
    [placement, shedDimensions]
  );

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
