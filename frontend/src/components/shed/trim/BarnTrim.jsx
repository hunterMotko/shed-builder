import { cornerBoards } from '../../../utils/trimGeometry';

/**
 * BarnTrim — the trim set that comes with the Barn Model.
 * Renders 4 corner boards only.
 * No eave fascia (covered by roof overhang), no knuckle boards (gambrel break
 * is a roof profile feature, not a side-wall trim board).
 * Only imported by BarnShed — never shared with GableShed.
 *
 * Whether the Barn really has no fascia is a product question, open in #22.
 *
 * Corner positions come from `cornerBoards`, not from this file: they used to
 * be worked out here and in GableTrim separately, and both copies buried the
 * board inside the siding (issue #31).
 */
export const BarnTrim = ({
  shedWidth,
  shedLength,
  wallHeight,
  trimColor,
  trimWidth,
}) => {
  const TRIM_MAT = { color: trimColor, roughness: 0.45, metalness: 0.1 };
  const corners = cornerBoards(shedWidth, shedLength, wallHeight, { trimWidth });

  return (
    <group name="barnTrim">
      {corners.map(({ corner, face, position, size }) => (
        <mesh key={`corner-${corner}-${face}`} position={position} castShadow receiveShadow>
          <boxGeometry args={size} />
          <meshStandardMaterial {...TRIM_MAT} />
        </mesh>
      ))}
    </group>
  );
};
