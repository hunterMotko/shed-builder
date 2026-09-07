import { useMemo } from 'react';
import { trimSet } from '../../../utils/trimGeometry';
import { ExtrudedBand } from '../../common/ExtrudedBand';

/**
 * GableTrim — the trim set that comes with the Gable Model.
 * Renders: 8 corner boards + 2 rake bands + 2 eave fascia + 4 corner boxes.
 * Only imported by GableShed — never shared with BarnShed.
 *
 * **Nothing here says what a Gable is trimmed with, or where any of it goes.**
 * `trimSet` answers both: which pieces a Model carries is part of the Model
 * bundle and a fact about the product, not about the renderer (CONTEXT.md,
 * ADR-0011). This file chooses the material and the primitive, and that is all
 * — the rake is a mitred outline so it goes through `ExtrudedBand`, the eave
 * and the corner boxes really are boxes and stay boxes. That split is what the
 * kernel's `boards` and `parts` are.
 */
export const GableTrim = ({ shedWidth, shedLength, wallHeight, tier, trimColor }) => {
  const TRIM_MAT = { color: trimColor, roughness: 0.6, metalness: 0 };

  // Memoised because the outlines below become extruded geometry: a fresh
  // array every render would rebuild every shape every render.
  const { boards, parts } = useMemo(
    () => trimSet('Gable', shedWidth, shedLength, wallHeight, tier),
    [shedWidth, shedLength, wallHeight, tier]
  );

  return (
    <group name="gableTrim">
      {/* Corner boards floor to eave, and the rake mitred at the apex */}
      {boards.map(({ id, outline, position, depth }) => (
        <ExtrudedBand key={id} outline={outline} position={position} depth={depth}>
          <meshStandardMaterial {...TRIM_MAT} />
        </ExtrudedBand>
      ))}

      {/* Eave fascia and the boxed soffit return at each corner */}
      {parts.map(({ id, position, size, rotation }) => (
        <mesh key={id} position={position} rotation={rotation} castShadow receiveShadow>
          <boxGeometry args={size} />
          <meshStandardMaterial {...TRIM_MAT} />
        </mesh>
      ))}
    </group>
  );
};
