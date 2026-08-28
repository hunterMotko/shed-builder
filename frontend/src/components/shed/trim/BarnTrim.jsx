import { cornerBoards, barnRakeFlashing } from '../../../utils/trimGeometry';
import { gambrelRoofTopLine } from '../../../utils/roofGeometry';

/**
 * BarnTrim — what finishes a Barn's edges.
 *
 * Corner boards, and the white band along both gambrel rakes. No eave fascia:
 * the roof panel runs 2 in past the side wall and finishes in J-channel, so
 * there is no board there to draw.
 *
 * ADR-0006 says the Barn gets fascia and this component said it does not; the
 * Reference Photos settle it, and both were half right. There is no *wood*
 * fascia anywhere on a Barn — but the rake is not bare either, and what runs
 * along it is the fly and the J-channel the panel edge insets into. That is
 * what `barnRakeFlashing` draws, which is why it is a band and not a board,
 * and why it hugs the slab's end cap with its top edge a reveal below the top
 * surface — the metal reads as a line above the white, never the other way
 * round. The channel's own metal face is `rakeJChannel`, drawn by GambrelRoof
 * in the roof colour. Issue #22.
 *
 * Corner positions come from `cornerBoards`, not from this file: they used to
 * be worked out here and in GableTrim separately, and both copies buried the
 * board inside the siding (issue #31).
 */
export const BarnTrim = ({
  shedWidth,
  shedLength,
  wallHeight,
  roofLowerPitch,
  roofUpperPitch,
  trimColor,
  trimWidth,
  overhangEave = 2 / 12,
}) => {
  const TRIM_MAT = { color: trimColor, roughness: 0.6, metalness: 0 };
  const corners = cornerBoards(shedWidth, shedLength, wallHeight, { trimWidth });
  const flashing = barnRakeFlashing(
    gambrelRoofTopLine(shedWidth, roofLowerPitch, roofUpperPitch, { overhang: overhangEave }),
    shedLength,
    wallHeight,
    { overhang: overhangEave }
  );

  return (
    <group name="barnTrim">
      {corners.map(({ corner, face, position, size }) => (
        <mesh key={`corner-${corner}-${face}`} position={position} castShadow receiveShadow>
          <boxGeometry args={size} />
          <meshStandardMaterial {...TRIM_MAT} />
        </mesh>
      ))}

      {flashing.map(({ id, position, size, rotation }) => (
        <mesh key={id} position={position} rotation={rotation} castShadow receiveShadow>
          <boxGeometry args={size} />
          <meshStandardMaterial {...TRIM_MAT} />
        </mesh>
      ))}
    </group>
  );
};
