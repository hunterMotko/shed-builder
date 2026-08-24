# Style-Specific Trim as Separate Components (GableTrim / BarnTrim)


## Revision log

| Date | Description |
|------|-------------|
| 2026-04-19 | Document created |

## Context

Architectural trim (corner boards, eave fascia, rake/barge boards) is a defining visual feature of real sheds that is currently missing from the 3D renderer. Trim geometry differs materially between the two shed styles: gable sheds require rake/barge boards that follow the roof slope on each gable end, while gambrel (barn) sheds have no triangular gable face and therefore no rake boards at all.

## Decision

We will implement trim as two separate style-specific components—`GableTrim` and `BarnTrim`—located in `frontend/src/components/shed/trim/`, each imported exclusively by its matching orchestration component (`GableShed` and `BarnShed` respectively). There is no shared `ShedTrim` component.

## Consequences

**Benefits:**
- `GableShed.jsx` is the sole importer of `GableTrim`, so adding or changing gable-specific trim geometry (including rake board angle calculations derived from `roofHeight` and `halfWidth`) touches only gable files.
- `BarnShed.jsx` is the sole importer of `BarnTrim`, isolating all barn trim changes to barn files.
- Each shed style orchestration component is visually complete on its own without any shared component requiring style awareness.
- Future shed styles (lean-to, saltbox, etc.) each receive their own trim component rather than contributing another branch to a shared conditional component.

**Tradeoffs:**
- Corner board and eave fascia geometry code is duplicated between `GableTrim` and `BarnTrim`. Both files compute identical formulas for the four vertical corner boards and the horizontal eave fascia boards. This duplication is accepted because the geometry is simple and per-style isolation is the higher priority.
- A single `ShedTrim` component with a `style` prop would consolidate the shared geometry in one place, but would require conditional rendering for rake boards and divergent prop sets, making the component nearly as large as two separate components while obscuring which geometry belongs to which style.

**Operational Implications:**
- Rake board angle in `GableTrim` is computed as `Math.atan2(roofHeight, halfWidth)`, which must stay synchronized with the same formula used in `GableRoof` to ensure trim boards seat flush against the roof surface.
- Both components accept `trimWidth=0.333` (approximately 4 inches) and `overhangEave=0.5` as defaulted props, so callers that do not pass these values will get standard lumber dimensions without explicit configuration.
- Neither component reads from the Zustand store directly; they receive all configuration through props from their parent orchestration component, consistent with the section component boundary rule in ADR-004.

## Implementation

1. Create `frontend/src/components/shed/trim/GableTrim.jsx` implementing corner boards, eave fascia boards, and rake/barge boards. Compute rake board angle via `Math.atan2(roofHeight, halfWidth)` and length via `Math.sqrt(halfWidth ** 2 + roofHeight ** 2)`.
2. Create `frontend/src/components/shed/trim/BarnTrim.jsx` implementing corner boards and eave fascia boards only. Omit rake board geometry entirely.
3. Define the shared prop interface for both components: `shedWidth`, `shedLength`, `wallHeight`, `trimColor`, `trimWidth` (default `0.333`), `overhangEave` (default `0.5`). Add `roofHeight` (default `4`) exclusively to `GableTrim`.
4. Apply `meshStandardMaterial` directly in both components using `trimColor` as the `color` prop. Do not route trim boards through the shader factory from ADR-002, as trim is simple painted wood requiring no procedural surface pattern.
5. Import `GableTrim` in `GableShed.jsx` and `BarnTrim` in `BarnShed.jsx`, passing props from the orchestration component's store-derived values. Ensure neither trim component is imported by the other orchestration component.

## Related Decisions

Trim components follow the same per-style isolation pattern established for `GableRoof` and `GambrelRoof`, and they intentionally bypass the shader factory because their material needs differ from siding and roofing surfaces.

**Implements**:
- **ADR-004** — Trim components follow the per-style section component isolation pattern: each is owned exclusively by its matching orchestration component, receives all configuration through props, and does not import the Zustand store

**Extends**:
- **ADR-002** — Trim boards use `meshStandardMaterial` directly rather than the shader factory; this extends the material strategy by establishing that the factory applies to surfaces with procedural patterns (siding, roofing) while plain painted surfaces use standard materials directly
