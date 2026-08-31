import { useMemo } from 'react';
import { cornerBoards, gableFasciaBoards, gableCornerBoxes, TRIM_WIDTH } from '../../../utils/trimGeometry';
import { ROOF_THICKNESS } from '../../../utils/roofGeometry';
import { ExtrudedBand } from '../../common/ExtrudedBand';

/**
 * GableTrim — the trim set that comes with the Gable Model.
 * Renders: 4 corner boards + 2 rake bands + 2 eave fascia + 4 corner boxes.
 * Only imported by GableShed — never shared with BarnShed.
 *
 * Nothing here works out a position. Corner boards come from `cornerBoards`,
 * shared with BarnTrim because a corner board is the same board on both Models;
 * the fascia comes from `gableFasciaBoards`, which is the Gable's alone. Both
 * live in `utils/trimGeometry.js` (ADR-0011).
 *
 * The rake is a mitred outline rather than a box, so it goes through
 * `ExtrudedBand`. The eave and the corner boxes are boxes and stay boxes.
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

  const corners = useMemo(
    () => cornerBoards(shedWidth, shedLength, wallHeight, { trimWidth }),
    [shedWidth, shedLength, wallHeight, trimWidth]
  );

  // Memoised because the rake outlines below become extruded geometry: a fresh
  // array every render would rebuild both shapes every render.
  const { rakes, eaves } = useMemo(
    () =>
      gableFasciaBoards(shedWidth, shedLength, wallHeight, roofHeight, {
        overhang: overhangEave,
        roofThickness: ROOF_THICKNESS,
      }),
    [shedWidth, shedLength, wallHeight, roofHeight, overhangEave]
  );

  const cornerBoxes = useMemo(
    () =>
      gableCornerBoxes(shedWidth, shedLength, wallHeight, roofHeight, {
        overhang: overhangEave,
        roofThickness: ROOF_THICKNESS,
      }),
    [shedWidth, shedLength, wallHeight, roofHeight, overhangEave]
  );

  return (
    <group name="gableTrim">
      {/* Corner boards, floor to eave: a Gable's roof does not cut them */}
      {corners.map(({ corner, face, outline, position, depth }) => (
        <ExtrudedBand
          key={`corner-${corner}-${face}`}
          outline={outline}
          position={position}
          depth={depth}
        >
          <meshStandardMaterial {...TRIM_MAT} />
        </ExtrudedBand>
      ))}

      {/* The rake: one board per gable end, mitred at the apex and cut plumb
          where the eave fascia laps it */}
      {rakes.map(({ id, outline, position, depth }) => (
        <ExtrudedBand key={id} outline={outline} position={position} depth={depth}>
          <meshStandardMaterial {...TRIM_MAT} />
        </ExtrudedBand>
      ))}

      {/* Eave fascia and the boxed soffit return at each corner */}
      {[...eaves, ...cornerBoxes].map(({ id, position, size, rotation }) => (
        <mesh key={id} position={position} rotation={rotation} castShadow receiveShadow>
          <boxGeometry args={size} />
          <meshStandardMaterial {...TRIM_MAT} />
        </mesh>
      ))}
    </group>
  );
};
