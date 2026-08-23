import { useMemo } from 'react';

const PANEL_WIDTH = 0.75;  // ft
const PANEL_THICK = 0.04;  // ft

/**
 * Skylight — translucent ridge skylight panels centered on the roof peak.
 *
 * Renders N panels end-to-end along the ridge (Z axis in local space).
 * Place this component at the peak position of the roof:
 *   position={[0, wallHeight + roofHeight, 0]} for a gable roof.
 *
 * Props:
 *   runningFt — total ridge length to cover in feet (from addOns.skylight.runningFt)
 *   numPanels — how many panels to split the run into (default 4)
 */
export const Skylight = ({ runningFt = 8, numPanels = 4 }) => {
  const segLen = runningFt / numPanels;

  const panels = useMemo(() => {
    return Array.from({ length: numPanels }, (_, i) => {
      const zOffset = (i - (numPanels - 1) / 2) * segLen;
      return zOffset;
    });
  }, [numPanels, segLen]);

  return (
    <group name="skylight">
      {panels.map((zOffset, i) => (
        <mesh key={i} position={[0, 0, zOffset]}>
          <boxGeometry args={[PANEL_WIDTH, PANEL_THICK, segLen - 0.04]} />
          <meshStandardMaterial
            color="#DDEEFF"
            transparent
            opacity={0.55}
            roughness={0.08}
            metalness={0.15}
          />
        </mesh>
      ))}
    </group>
  );
};
