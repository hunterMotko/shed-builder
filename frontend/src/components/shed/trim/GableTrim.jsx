import { cornerBoards, TRIM_WIDTH } from '../../../utils/trimGeometry';

/**
 * GableTrim — the trim set that comes with the Gable Model.
 * Renders: 4 corner boards + 2 eave fascia boards + 4 rake boards.
 * Only imported by GableShed — never shared with BarnShed.
 *
 * Corner positions come from `cornerBoards`, shared with BarnTrim — a corner
 * board is the same board on both Models. What differs is everything else
 * here, which is the Model's trim set and stays per-Model on purpose.
 */
export const GableTrim = ({
  shedWidth,
  shedLength,
  wallHeight,
  roofHeight = 4,
  trimColor,
  trimWidth = TRIM_WIDTH,
  overhangEave = 0.5,
}) => {
  const halfW = shedWidth / 2;
  const halfL = shedLength / 2;
  const tw    = trimWidth;

  const rakeLength = Math.sqrt(halfW * halfW + roofHeight * roofHeight);
  const rakeAngle  = Math.atan2(roofHeight, halfW);

  const TRIM_MAT = { color: trimColor, roughness: 0.45, metalness: 0.1 };

  const corners = cornerBoards(shedWidth, shedLength, wallHeight, { trimWidth });

  // Rake board configs: [centerX, centerZ, rotZ]
  const rakes = [
    [-halfW / 2, +(halfL + 0.01),  +rakeAngle],
    [+halfW / 2, +(halfL + 0.01),  -rakeAngle],
    [-halfW / 2, -(halfL + 0.01),  +rakeAngle],
    [+halfW / 2, -(halfL + 0.01),  -rakeAngle],
  ];

  return (
    <group name="gableTrim">
      {/* Corner boards */}
      {corners.map(({ corner, face, position, size }) => (
        <mesh key={`corner-${corner}-${face}`} position={position} castShadow receiveShadow>
          <boxGeometry args={size} />
          <meshStandardMaterial {...TRIM_MAT} />
        </mesh>
      ))}

      {/* Eave fascia boards (long sides) — at eave edge of widened roof profile */}
      {[-(halfW + overhangEave - tw / 2), +(halfW + overhangEave - tw / 2)].map((fx, i) => (
        <mesh key={`fascia-${i}`} position={[fx, wallHeight - tw / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[tw, tw, shedLength]} />
          <meshStandardMaterial {...TRIM_MAT} />
        </mesh>
      ))}

      {/* Rake boards (gable-end slopes) */}
      {rakes.map(([rx, rz, rotZ], i) => (
        <mesh
          key={`rake-${i}`}
          position={[rx, wallHeight + roofHeight / 2, rz]}
          rotation={[0, 0, rotZ]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[rakeLength, tw, tw]} />
          <meshStandardMaterial {...TRIM_MAT} />
        </mesh>
      ))}
    </group>
  );
};
