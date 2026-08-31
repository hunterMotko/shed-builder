# Style-Specific Trim as Separate Components (GableTrim / BarnTrim)


## Revision log

| Date | Description |
|------|-------------|
| 2026-04-19 | Document created |
| 2026-08-30 | Corrected the per-Model trim set against the Reference Photos (#22). This ADR had the Barn exactly backwards: it prescribed corner boards plus eave fascia and told the implementer to "omit rake board geometry entirely", when a Barn in fact carries corner boards **and a rake**, and **no fascia**. The Tradeoffs section's claimed fascia duplication therefore never existed. Also replaced the flat `overhangEave` default, which was a Gable number applied to both Models. |

## Context

Architectural trim (corner boards, eave fascia, rake/barge boards) is a defining visual feature of real sheds that is currently missing from the 3D renderer. Trim geometry differs materially between the two shed styles: gable sheds require rake/barge boards that follow the roof slope on each gable end, while gambrel (barn) sheds have no triangular gable face and therefore no rake boards at all.

**Corrected 2026-08-30 (#22).** The second half of that sentence is false, and it is the error the rest of this document is built on. A Barn does have a gable end — a gambrel face, not a triangle — and the Reference Photos show it carrying the most visually defining trim on the building: a band following the roofline the whole way, up the steep lower slope, across the Knuckle, and up the shallow upper slope to the peak. What a Barn does *not* carry is eave fascia; its long walls run straight up into the roof edge with no board. The trim set per Model, read off the photographs:

| | Corner boards | Eave fascia | Rake |
|---|---|---|---|
| Gable | yes | **yes** | yes, straight |
| Barn | yes | **no** | **yes, following the gambrel** |

## Decision

We will implement trim as two separate style-specific components—`GableTrim` and `BarnTrim`—located in `frontend/src/components/shed/trim/`, each imported exclusively by its matching orchestration component (`GableShed` and `BarnShed` respectively). There is no shared `ShedTrim` component.

## Consequences

**Benefits:**
- `GableShed.jsx` is the sole importer of `GableTrim`, so adding or changing gable-specific trim geometry (including rake board angle calculations derived from `roofHeight` and `halfWidth`) touches only gable files.
- `BarnShed.jsx` is the sole importer of `BarnTrim`, isolating all barn trim changes to barn files.
- Each shed style orchestration component is visually complete on its own without any shared component requiring style awareness.
- Future shed styles (lean-to, saltbox, etc.) each receive their own trim component rather than contributing another branch to a shared conditional component.

**Tradeoffs:**
- ~~Corner board and eave fascia geometry code is duplicated between `GableTrim` and `BarnTrim`. Both files compute identical formulas for the four vertical corner boards and the horizontal eave fascia boards. This duplication is accepted because the geometry is simple and per-style isolation is the higher priority.~~ **Corrected 2026-08-30 (#22):** this duplication never existed and could not have — only a Gable carries eave fascia. The corner boards, which genuinely are the same board on both Models, are not duplicated either: ADR-0011's rule was extended to trim, and `cornerBoards` in `utils/trimGeometry.js` is the single place a corner position is worked out. Neither component computes a trim position; both ask.
- A single `ShedTrim` component with a `style` prop would consolidate the shared geometry in one place, but would require conditional rendering for rake boards and divergent prop sets, making the component nearly as large as two separate components while obscuring which geometry belongs to which style.

**Operational Implications:**
- Rake board angle in `GableTrim` is computed as `Math.atan2(roofHeight, halfWidth)`, which must stay synchronized with the same formula used in `GableRoof` to ensure trim boards seat flush against the roof surface.
- Both components accept `trimWidth=0.333` (approximately 4 inches), which the Reference Photos confirm — measured at 15-18px on a photo scaling at 48.5 px/ft. ~~and `overhangEave=0.5` as defaulted props~~ **Corrected 2026-08-30 (#22):** a single `0.5 ft` eave overhang was a Gable number applied to both Models. The overhang is a per-Model shop spec and comes from `roofOverhangFt(model, width)`: a Gable gets a 6 5/8in soffit and fascia box, except at 16 wide where it is 4 7/8in; a Barn gets 2in and finishes in J-channel. Trim components take the overhang as a prop rather than defaulting it.
- Neither component reads from the Zustand store directly; they receive all configuration through props from their parent orchestration component, consistent with the section component boundary rule in ADR-004.

## Implementation

1. Create `frontend/src/components/shed/trim/GableTrim.jsx` implementing corner boards, eave fascia boards, and rake/barge boards. Compute rake board angle via `Math.atan2(roofHeight, halfWidth)` and length via `Math.sqrt(halfWidth ** 2 + roofHeight ** 2)`.
2. ~~Create `frontend/src/components/shed/trim/BarnTrim.jsx` implementing corner boards and eave fascia boards only. Omit rake board geometry entirely.~~ **Corrected 2026-08-30 (#22):** `BarnTrim` implements corner boards and the rake band, and omits eave fascia — the reverse of the original instruction. The rake is two runs per side, not one: it breaks at the Knuckle and follows both gambrel slopes. It is also not a board. The roof panel runs past the wall and finishes in J-channel, and what the photographs show along that edge is the fly *under* the metal, so the panel edge laps it.
3. Define the shared prop interface for both components: `shedWidth`, `shedLength`, `wallHeight`, `trimColor`, `trimWidth` (default `0.333`), `overhangEave` (default `0.5`). Add `roofHeight` (default `4`) exclusively to `GableTrim`.
4. Apply `meshStandardMaterial` directly in both components using `trimColor` as the `color` prop. Do not route trim boards through the shader factory from ADR-002, as trim is simple painted wood requiring no procedural surface pattern.
5. Import `GableTrim` in `GableShed.jsx` and `BarnTrim` in `BarnShed.jsx`, passing props from the orchestration component's store-derived values. Ensure neither trim component is imported by the other orchestration component.

## Related Decisions

Trim components follow the same per-style isolation pattern established for `GableRoof` and `GambrelRoof`, and they intentionally bypass the shader factory because their material needs differ from siding and roofing surfaces.

**Implements**:
- **ADR-004** — Trim components follow the per-style section component isolation pattern: each is owned exclusively by its matching orchestration component, receives all configuration through props, and does not import the Zustand store

**Extends**:
- **ADR-002** — Trim boards use `meshStandardMaterial` directly rather than the shader factory; this extends the material strategy by establishing that the factory applies to surfaces with procedural patterns (siding, roofing) while plain painted surfaces use standard materials directly
