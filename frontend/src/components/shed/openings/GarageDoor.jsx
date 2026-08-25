import { useMemo } from 'react';
import { openingTransform } from '../../../utils/wallOpenings';

const OFFSET = 0.3;

/**
 * GarageDoor — sectional overhead garage door.
 *
 * Renders horizontal panel sections with raised-panel detail, side tracks, and a header rail.
 * The opening itself is cut by ShedWall's CSG (placement type 'garage_door').
 */
export const GarageDoor = ({
  placement,
  shedDimensions,
  trimColor = '#8B7355',
  doorStyle = 'sectional',
}) => {
  const elemWidth  = placement.width;
  const elemHeight = placement.height;
  const panelCount = Math.max(3, Math.ceil(elemHeight));
  const panelHeight = elemHeight / panelCount;

  const RIB_HEIGHT = 0.18;
  const ribCount   = Math.ceil(elemHeight / RIB_HEIGHT);
  const actualRibH = elemHeight / ribCount;

  const { position: pos, rotation: rot } = useMemo(
    () => openingTransform(placement, shedDimensions, OFFSET),
    [placement, shedDimensions]
  );

  const panelRows = useMemo(() => {
    return Array.from({ length: panelCount }, (_, i) => ({
      y: -elemHeight / 2 + panelHeight * i + panelHeight / 2,
      index: i,
    }));
  }, [panelCount, panelHeight, elemHeight]);

  const PANEL_COLOR   = trimColor;
  const TRACK_COLOR   = '#555555';
  const HARDWARE_COLOR = '#888888';

  return (
    <group position={pos} rotation={rot}>
      {/* Horizontal panel sections or roll-up ribs */}
      {doorStyle === 'rollup' ? (
        Array.from({ length: ribCount }, (_, i) => {
          const y = -elemHeight / 2 + actualRibH * i + actualRibH / 2;
          return (
            <group key={i} position={[0, y, 0]}>
              {/* Rib face slab */}
              <mesh castShadow receiveShadow>
                <boxGeometry args={[elemWidth - 0.06, actualRibH - 0.015, 0.04]} />
                <meshStandardMaterial color={PANEL_COLOR} roughness={0.35} metalness={0.3} />
              </mesh>
              {/* Corrugated ridge at top of rib */}
              <mesh position={[0, actualRibH * 0.35, 0.025]}>
                <boxGeometry args={[elemWidth - 0.06, actualRibH * 0.25, 0.025]} />
                <meshStandardMaterial color={PANEL_COLOR} roughness={0.3} metalness={0.35} />
              </mesh>
            </group>
          );
        })
      ) : (
        panelRows.map(({ y, index }) => (
          <group key={index} position={[0, y, 0]}>
            {/* Panel slab */}
            <mesh castShadow receiveShadow>
              <boxGeometry args={[elemWidth - 0.05, panelHeight - 0.04, 0.06]} />
              <meshStandardMaterial color={PANEL_COLOR} roughness={0.5} metalness={0.05} />
            </mesh>
            {/* Raised-panel inset detail */}
            <mesh position={[0, 0, 0.04]}>
              <boxGeometry args={[elemWidth - 0.3, panelHeight - 0.18, 0.015]} />
              <meshStandardMaterial color={PANEL_COLOR} roughness={0.6} metalness={0.0} />
            </mesh>
          </group>
        ))
      )}

      {/* Side tracks */}
      {[-elemWidth / 2 - 0.06, elemWidth / 2 + 0.06].map((x) => (
        <mesh key={x} position={[x, 0, 0.03]} castShadow>
          <boxGeometry args={[0.07, elemHeight + 0.12, 0.07]} />
          <meshStandardMaterial color={TRACK_COLOR} roughness={0.5} metalness={0.6} />
        </mesh>
      ))}

      {/* Top header rail */}
      <mesh position={[0, elemHeight / 2 + 0.07, 0.03]}>
        <boxGeometry args={[elemWidth + 0.2, 0.1, 0.1]} />
        <meshStandardMaterial color={TRACK_COLOR} roughness={0.5} metalness={0.6} />
      </mesh>

      {/* Center lift handle */}
      <mesh position={[0, -elemHeight / 2 + 0.35, 0.08]}>
        <boxGeometry args={[0.45, 0.06, 0.05]} />
        <meshStandardMaterial color={HARDWARE_COLOR} roughness={0.3} metalness={0.8} />
      </mesh>
    </group>
  );
};
