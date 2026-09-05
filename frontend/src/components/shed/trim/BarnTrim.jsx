import { useMemo } from 'react';
import { cornerBoards, barnRakeFlashing } from '../../../utils/trimGeometry';
import { gambrelRoofTopLine, ROOF_THICKNESS } from '../../../utils/roofGeometry';
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
 * what `barnRakeFlashing` draws, which is why it is a band and not a board,
 * and why it hugs the slab's end cap with its top edge a reveal below the top
 * surface — the metal reads as a line above the white, never the other way
 * round. It arrives as one mitred outline per end rather than a run of boxes,
 * so it turns both Knuckles and the ridge without poking past the roof's
 * silhouette. The channel's own metal face is `rakeJChannel`, drawn by
 * GambrelRoof in the roof colour. Issue #22.
 *
 * Corner positions come from `cornerBoards`, not from this file: they used to
 * be worked out here and in GableTrim separately, and both copies buried the
 * board inside the siding (issue #31). What this file supplies is where their
 * tops land, because that is the one thing about a corner board a Barn does
 * differently — it is cut to the gambrel, not to the eave.
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

  // Memoised because every outline below becomes extruded geometry: a fresh
  // array each render would rebuild every shape each render.
  const { corners, flashing } = useMemo(() => {
    const topLine = gambrelRoofTopLine(shedWidth, roofLowerPitch, roofUpperPitch, {
      overhang: overhangEave,
    });
    // The corner boards are cut on the roof's underside: parallel to the fly,
    // so they carry the gambrel's angle, and as high as a board can go before
    // it enters the slab. Level, they buried their tops in the roof; cut on
    // the fly's own lower edge, which hangs 2.4 in under the slab, that much
    // siding showed between the board and the fly from anywhere but dead on.
    //
    // The rule is named rather than passed as a callback: this file used to
    // compose it here out of `bandUnderside`, `ROOF_THICKNESS` and
    // `wallHeight`, which put three terms of a geometry expression on the far
    // side of the boundary from the geometry. The kernel owns it now.
    return {
      corners: cornerBoards(shedWidth, shedLength, wallHeight, {
        trimWidth,
        top: { kind: 'roof-underside', topLine, roofThickness: ROOF_THICKNESS },
      }),
      flashing: barnRakeFlashing(topLine, shedLength, wallHeight, {
        overhang: overhangEave,
        roofThickness: ROOF_THICKNESS,
      }),
    };
  }, [shedWidth, shedLength, wallHeight, roofLowerPitch, roofUpperPitch, overhangEave, trimWidth]);

  return (
    <group name="barnTrim">
      {corners.map(({ id, outline, position, depth }) => (
        <ExtrudedBand
          key={id}
          outline={outline}
          position={position}
          depth={depth}
        >
          <meshStandardMaterial {...TRIM_MAT} />
        </ExtrudedBand>
      ))}

      {flashing.map(({ id, outline, position, depth }) => (
        <ExtrudedBand key={id} outline={outline} position={position} depth={depth}>
          <meshStandardMaterial {...TRIM_MAT} />
        </ExtrudedBand>
      ))}
    </group>
  );
};
