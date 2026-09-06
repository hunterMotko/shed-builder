import { useMemo } from 'react';
import { trimSet } from '../../../utils/trimGeometry';
import { ExtrudedBand } from '../../common/ExtrudedBand';

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
 * what the fly boards are, which is why they are bands and not boxes, and why
 * they hug the slab's end cap with their top edge a reveal below the top
 * surface — the metal reads as a line above the white, never the other way
 * round. Each arrives as one mitred outline per end rather than a run of
 * boxes, so it turns both Knuckles and the ridge without poking past the
 * roof's silhouette. The channel's own metal face is roof metal, drawn by
 * GambrelRoof in the roof colour. Issue #22.
 *
 * **This file no longer says what a Barn is trimmed with.** It used to list
 * the pieces and compose the rule for where the corner boards' tops land;
 * `trimSet` answers both, because which trim a Model carries is part of the
 * Model bundle and a fact about the product rather than about the renderer
 * (CONTEXT.md). Four components each listing their own half of that fact is
 * how a bill of materials and a render come to disagree about what a shed is.
 * What is left here is the material and the primitive — a Barn's trim is all
 * boards, so there is one map and no boxes.
 */
export const BarnTrim = ({
  shedWidth,
  shedLength,
  wallHeight,
  roofLowerPitch,
  roofUpperPitch,
  trimColor,
}) => {
  const TRIM_MAT = { color: trimColor, roughness: 0.6, metalness: 0 };

  // Memoised because every outline below becomes extruded geometry: a fresh
  // array each render would rebuild every shape each render.
  const { boards } = useMemo(
    () =>
      trimSet('Barn', shedWidth, shedLength, wallHeight, {
        pitches: { lower: roofLowerPitch, upper: roofUpperPitch },
      }),
    [shedWidth, shedLength, wallHeight, roofLowerPitch, roofUpperPitch]
  );

  return (
    <group name="barnTrim">
      {boards.map(({ id, outline, position, depth }) => (
        <ExtrudedBand key={id} outline={outline} position={position} depth={depth}>
          <meshStandardMaterial {...TRIM_MAT} />
        </ExtrudedBand>
      ))}
    </group>
  );
};
