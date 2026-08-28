import { cornerBoards, gableFasciaBoards, gableCornerBoxes, TRIM_WIDTH } from '../../../utils/trimGeometry';
import { ROOF_THICKNESS } from '../../../utils/roofGeometry';

/**
 * GableTrim — the trim set that comes with the Gable Model.
 * Renders: 4 corner boards + 2 eave fascia + 4 rake boards + 4 corner boxes.
 * Only imported by GableShed — never shared with BarnShed.
 *
 * Nothing here works out a position. Corner boards come from `cornerBoards`,
 * shared with BarnTrim because a corner board is the same board on both Models;
 * the fascia comes from `gableFasciaBoards`, which is the Gable's alone. Both
 * live in `utils/trimGeometry.js` (ADR-0011).
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
  const TRIM_MAT = { color: trimColor, roughness: 0.6, metalness: 0 };

  const corners = cornerBoards(shedWidth, shedLength, wallHeight, { trimWidth });
  const fascia = gableFasciaBoards(shedWidth, shedLength, wallHeight, roofHeight, {
    overhang: overhangEave,
    roofThickness: ROOF_THICKNESS,
  });
  const cornerBoxes = gableCornerBoxes(shedWidth, shedLength, wallHeight, roofHeight, {
    overhang: overhangEave,
    roofThickness: ROOF_THICKNESS,
  });

  return (
    <group name="gableTrim">
      {/* Corner boards */}
      {corners.map(({ corner, face, position, size }) => (
        <mesh key={`corner-${corner}-${face}`} position={position} castShadow receiveShadow>
          <boxGeometry args={size} />
          <meshStandardMaterial {...TRIM_MAT} />
        </mesh>
      ))}

      {/* Rake and eave fascia, boxing in the roof slab's cut edge */}
      {[...fascia, ...cornerBoxes].map(({ id, position, size, rotation }) => (
        <mesh key={id} position={position} rotation={rotation} castShadow receiveShadow>
          <boxGeometry args={size} />
          <meshStandardMaterial {...TRIM_MAT} />
        </mesh>
      ))}
    </group>
  );
};
