import { useMemo, useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useShedStore } from '../store/shedStore';
import { csgModifier } from '../utils/csgOperations';
import { getEffectiveTrimColor } from '../utils/colorUtils';
import { DoorObject } from './DoorObject';
import { WindowObject } from './WindowObject';

/**
 * Enhanced Shed component with detailed trim, siding, and roof features
 */
export const Shed = ({
  width = 10,
  length = 12,
  wallHeight = 8,
  style = 'Gable',
  color = '#8B4513',
  roofColor = '#2F4F4F',
  onShedMeshReady = null,
}) => {
  const groupRef = useRef();
  const meshRef = useRef();
  const wallMeshesRef = useRef([]);

  const placements = useShedStore((state) => state.placements);
  const trimColor = useShedStore((state) => state.trimColor);
  const trimColorMode = useShedStore((state) => state.trimColorMode);
  const trimAutoMode = useShedStore((state) => state.trimAutoMode);
  const sidingTexture = useShedStore((state) => state.sidingTexture);
  const roofMaterial = useShedStore((state) => state.roofMaterial);

  const [modifiedGeometry, setModifiedGeometry] = useState(null);
  const roofHeight = 3;
  const eaveThickness = 0.4; // Fascia trim thickness in feet
  const cornerTrimWidth = 0.6; // Corner trim width in feet
  const foundationHeight = 0.5; // Foundation/skid height

  // Calculate effective trim color
  const effectiveTrimColor = useMemo(
    () =>
      getEffectiveTrimColor(
        trimColor,
        trimColorMode,
        color,
        roofColor,
        trimAutoMode
      ),
    [trimColor, trimColorMode, color, roofColor, trimAutoMode]
  );

  // Apply CSG operations when placements change
  useEffect(() => {
    if (placements.length > 0 && meshRef.current) {
      try {
        const baseGeometry = meshRef.current.geometry;
        const modifiedGeo = csgModifier.applyAllPlacements(
          baseGeometry,
          placements,
          { width, length, wallHeight }
        );
        setModifiedGeometry(modifiedGeo);
      } catch (error) {
        console.error('Error applying CSG operations:', error);
        setModifiedGeometry(null);
      }
    } else {
      setModifiedGeometry(null);
    }
  }, [placements, width, length, wallHeight]);

  // Notify parent when mesh is ready for raycasting
  useEffect(() => {
    if (meshRef.current && onShedMeshReady) {
      onShedMeshReady(meshRef.current, { width, length, wallHeight });
    }
  }, [width, length, wallHeight, onShedMeshReady]);

  const halfWidth = width / 2;
  const halfLength = length / 2;

  // Wall shape (rectangular)
  const wallShape = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-halfWidth, 0);
    shape.lineTo(halfWidth, 0);
    shape.lineTo(halfWidth, wallHeight);
    shape.lineTo(-halfWidth, wallHeight);
    shape.closePath();
    return shape;
  }, [width, wallHeight, halfWidth]);

  // Roof shape
  const roofShape = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-halfWidth, wallHeight);
    shape.lineTo(halfWidth, wallHeight);

    if (style === 'Barn') {
      const knuckleX = halfWidth * 0.85;
      const knuckleY = wallHeight + roofHeight * 0.5;
      const peakY = wallHeight + roofHeight;

      shape.lineTo(knuckleX, knuckleY);
      shape.lineTo(0, peakY);
      shape.lineTo(-knuckleX, knuckleY);
    } else {
      const peakY = wallHeight + roofHeight;
      shape.lineTo(0, peakY);
    }

    shape.lineTo(-halfWidth, wallHeight);
    shape.closePath();
    return shape;
  }, [width, wallHeight, roofHeight, style, halfWidth]);

  // Extrude settings
  const extrudeSettings = useMemo(
    () => ({
      depth: length,
      bevelEnabled: false,
    }),
    [length]
  );

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* FOUNDATION/SKID BASE */}
      <mesh position={[0, -foundationHeight / 2, 0]}>
        <boxGeometry args={[width + cornerTrimWidth * 2, foundationHeight, length + cornerTrimWidth * 2]} />
        <meshStandardMaterial
          color="#3E3E3E"
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* MAIN WALL GEOMETRY */}
      <mesh
        ref={meshRef}
        name="shedMesh"
        rotation={[0, 0, 0]}
        raycast={() => {}}
      >
        {modifiedGeometry ? (
          <primitive object={modifiedGeometry} attach="geometry" />
        ) : (
          <extrudeGeometry args={[wallShape, extrudeSettings]} />
        )}
        <meshStandardMaterial
          color={color}
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>

      {/* ROOF GEOMETRY */}
      <mesh name="roofMesh" rotation={[0, 0, 0]}>
        <extrudeGeometry args={[roofShape, extrudeSettings]} />
        <meshStandardMaterial
          color={roofColor}
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>

      {/* EAVE/FASCIA TRIM - Four edges of roof overhang */}
      {/* Front eave trim */}
      <mesh position={[0, wallHeight + roofHeight * 0.5, halfLength + eaveThickness / 2]}>
        <boxGeometry args={[width + cornerTrimWidth * 2, eaveThickness, eaveThickness]} />
        <meshStandardMaterial color={effectiveTrimColor} roughness={0.6} metalness={0.15} />
      </mesh>

      {/* Back eave trim */}
      <mesh position={[0, wallHeight + roofHeight * 0.5, -halfLength - eaveThickness / 2]}>
        <boxGeometry args={[width + cornerTrimWidth * 2, eaveThickness, eaveThickness]} />
        <meshStandardMaterial color={effectiveTrimColor} roughness={0.6} metalness={0.15} />
      </mesh>

      {/* Left eave trim */}
      <mesh position={[-halfWidth - eaveThickness / 2, wallHeight + roofHeight * 0.5, 0]}>
        <boxGeometry args={[eaveThickness, eaveThickness, length + cornerTrimWidth * 2]} />
        <meshStandardMaterial color={effectiveTrimColor} roughness={0.6} metalness={0.15} />
      </mesh>

      {/* Right eave trim */}
      <mesh position={[halfWidth + eaveThickness / 2, wallHeight + roofHeight * 0.5, 0]}>
        <boxGeometry args={[eaveThickness, eaveThickness, length + cornerTrimWidth * 2]} />
        <meshStandardMaterial color={effectiveTrimColor} roughness={0.6} metalness={0.15} />
      </mesh>

      {/* CORNER TRIM - Vertical edges on all four corners */}
      {/* Front-left corner trim */}
      <mesh position={[-halfWidth - cornerTrimWidth / 2, wallHeight / 2, halfLength + cornerTrimWidth / 2]}>
        <boxGeometry args={[cornerTrimWidth, wallHeight, cornerTrimWidth]} />
        <meshStandardMaterial color={effectiveTrimColor} roughness={0.6} metalness={0.15} />
      </mesh>

      {/* Front-right corner trim */}
      <mesh position={[halfWidth + cornerTrimWidth / 2, wallHeight / 2, halfLength + cornerTrimWidth / 2]}>
        <boxGeometry args={[cornerTrimWidth, wallHeight, cornerTrimWidth]} />
        <meshStandardMaterial color={effectiveTrimColor} roughness={0.6} metalness={0.15} />
      </mesh>

      {/* Back-left corner trim */}
      <mesh position={[-halfWidth - cornerTrimWidth / 2, wallHeight / 2, -halfLength - cornerTrimWidth / 2]}>
        <boxGeometry args={[cornerTrimWidth, wallHeight, cornerTrimWidth]} />
        <meshStandardMaterial color={effectiveTrimColor} roughness={0.6} metalness={0.15} />
      </mesh>

      {/* Back-right corner trim */}
      <mesh position={[halfWidth + cornerTrimWidth / 2, wallHeight / 2, -halfLength - cornerTrimWidth / 2]}>
        <boxGeometry args={[cornerTrimWidth, wallHeight, cornerTrimWidth]} />
        <meshStandardMaterial color={effectiveTrimColor} roughness={0.6} metalness={0.15} />
      </mesh>

      {/* ROOF MATERIAL VISUAL DETAILS */}
      {roofMaterial === 'metal' && (
        <>
          {/* Corrugated metal roof visual - horizontal lines suggesting panels */}
          {Array.from({ length: 8 }).map((_, i) => (
            <mesh
              key={`roof-panel-${i}`}
              position={[0, wallHeight + roofHeight * 0.5, -halfLength + (i * length) / 8]}
            >
              <boxGeometry args={[width * 1.2, 0.08, 0.15]} />
              <meshStandardMaterial
                color={roofColor}
                roughness={0.5}
                metalness={0.4}
              />
            </mesh>
          ))}
        </>
      )}

      {/* Door and Window Objects */}
      {placements.map((placement) => {
        if (placement.type === 'door') {
          return (
            <DoorObject
              key={placement.id}
              placement={placement}
              shedDimensions={{ width, length, wallHeight }}
              trimColor={effectiveTrimColor}
            />
          );
        } else if (placement.type === 'window') {
          return (
            <WindowObject
              key={placement.id}
              placement={placement}
              shedDimensions={{ width, length, wallHeight }}
              trimColor={effectiveTrimColor}
            />
          );
        }
        return null;
      })}
    </group>
  );
};
