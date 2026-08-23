# Architecture Decision Records — 3D Shed Configurator

This file collects the Architecture Decision Records (ADRs) for the React Three Fiber shed configurator frontend. Each ADR documents one significant design choice: the context that drove it, the decision made, and the consequences that follow.

---

# ADR-001: Per-Wall CSG in Local Coordinate Space

## Revision log

| Date | Description |
|------|-------------|
| 2026-04-11 | Document created |

## Context

The shed renderer must cut door and window openings out of wall geometry at runtime using Boolean subtraction (CSG). The original `csgOperations.js` implementation operated in world space, computing absolute Three.js world coordinates for each placement before calling `Evaluator.evaluate()`. As the codebase introduced `ShedWall` as an independently renderable component, performing CSG in world space required every wall to know the full shed's world origin and all sibling wall offsets—coupling that was unnecessary and error-prone.

## Decision

We will perform CSG operations in each wall's local coordinate space by centering the subtraction box at `(localX, localY, 0)` relative to the wall slab geometry origin, rather than converting placement coordinates to absolute world coordinates first.

## Consequences

**Benefits:**
- Coordinate math is reduced to two linear mappings: `localX = -geomWidth/2 + normalizedX * geomWidth` and `localY = -wallHeight/2 + normalizedY * wallHeight`. No wall needs to know the shed's world position.
- `ShedWall` is fully self-contained: it receives only its own placements, its own geometry dimensions, and its side identifier. No cross-wall coupling is required.
- The subtraction box depth is simply `WALL_THICKNESS + 0.1`, a constant, because local Z is always the wall's through-axis. In world space this constant would need to change per wall orientation.
- Side-specific rotation (left/right walls are rotated `[0, -π/2, 0]`) becomes a render-time concern only; the CSG geometry itself is always axis-aligned at origin.

**Tradeoffs:**
- Normalized placement coordinates must be interpreted relative to the geometry width, not the logical shed width. For front and back walls `geomWidth === shedWidth`, but for left and right walls `geomWidth === shedLength - WALL_THICKNESS * 2` (the fit-between span). Any consumer that forgets this distinction will misplace cutouts by up to one wall thickness on each side.
- The `getWorldCoordinates` method in `CSGShedModifier` still exists for legacy callers and roof CSG, and it computes differently than the local-space path. Two parallel coordinate systems coexist until legacy callers are removed.
- The `applyWallPlacements` method in `CSGShedModifier` was written to call `subtractOpening` (the world-space path) inside a loop that sets up local coordinates—a latent bug showing the two systems were not cleanly separated during migration.

**Operational Implications:**
- CSG is triggered by a `useEffect` inside `ShedWall` with dependencies `[placements, baseGeometry, localGeomWidth, wallHeight, side]`. Any dimension change that alters `localGeomWidth` or `wallHeight` will re-run CSG for all four walls simultaneously on the main thread.
- React state for modified geometry is stored as `useState(null)` inside `ShedWall` and falls back to `baseGeometry` on error, so a CSG failure degrades gracefully to an uncut wall rather than a crash.

## Implementation

1. In `ShedWall.jsx`, compute local opening center: `localX = -localGeomWidth / 2 + p.normalizedX * localGeomWidth` and `localY = -wallHeight / 2 + p.normalizedY * wallHeight`.
2. Construct the cut mesh at `(localX, localY, 0)` with depth `WALL_THICKNESS + 0.1` before calling `evaluator.evaluate()`.
3. Export `WALL_THICKNESS` from `ShedWall.jsx` so roof and gable components can align their geometry to wall surfaces without hardcoding the constant.
4. Pass only the placements belonging to a given side down to that `ShedWall` instance: `placements.filter((p) => p.wall === side)`.
5. Retire `applyWallPlacements` in `csgOperations.js` once all consumers have migrated to the `ShedWall`-internal CSG path.

## Related Decisions

This decision is the geometric foundation that makes `ShedWall` self-contained. It directly enables the composable component architecture described in ADR-004, and it determines the performance ceiling analyzed in ADR-005.

**Required by**:
- **ADR-004** — Composable shed architecture requires each wall component to own its own CSG without needing sibling or parent state

**Constrains**:
- **ADR-005** — Local-space CSG is performed synchronously inside a `useEffect`; the per-wall, per-dimension-change trigger pattern sets the load profile that determines Web Worker viability

---

# ADR-002: Shader Factory Pattern for Siding and Roof Materials

## Revision log

| Date | Description |
|------|-------------|
| 2026-04-11 | Document created |

## Context

Siding and roofing visual effects—T1-11 vertical groove lines for siding, corrugated metal and asphalt shingle patterns for roofing—must appear consistently across `ShedWall`, `GableEnd`, `GableRoof`, `GambrelRoof`, and `Porch`. Without centralization, each component would define its own GLSL strings and `uniforms` objects, creating five independent maintenance points for what is effectively one material per surface type.

## Decision

We will centralize all procedural shader definitions in `frontend/src/utils/shaders.js` by exporting two factory functions—`makeSidingShader(color, sidingTexture)` and `makeRoofShader(roofColor, roofMaterial)`—that return plain `ShaderMaterial` configuration objects consumed via `<shaderMaterial args={[config]} />`.

## Consequences

**Benefits:**
- A single GLSL change propagates to all four siding surfaces and all three roof surfaces simultaneously, eliminating drift between visual implementations.
- Components reduce to a single `useMemo` call: `const sidingShader = useMemo(() => makeSidingShader(color, sidingTexture), [color, sidingTexture])`. No component owns shader logic.
- The roof shader uses a `isShingle` uniform blended between metal and shingle modes (`mix(metalColor, shingleColor, isShingle)`), allowing the material switch to be driven by a uniform update rather than a geometry or material swap.
- The siding shader's `useRibs` uniform (0.0 for smooth, 1.0 for T1-11) follows the same pattern, keeping both siding variants in one shader program.

**Tradeoffs:**
- React Three Fiber's automatic `dispose()` lifecycle does not apply to `ShaderMaterial` instances created outside the JSX tree. Each call to `makeSidingShader` or `makeRoofShader` allocates a new `THREE.Color` and a new `ShaderMaterial` configuration. When `color` or `sidingTexture` changes, the old material is not automatically disposed, creating a GPU memory leak proportional to the number of color or texture changes in a session.
- Shader uniforms are embedded in a plain object rather than a `THREE.ShaderMaterial` instance, so callers cannot update individual uniforms reactively—they must recreate the entire material config. A design that passed a stable `THREE.ShaderMaterial` instance and mutated its `uniforms.color.value` directly would avoid re-creating the material on every color change.
- GLSL errors are silent at authoring time and only surface as runtime console errors. The factory functions have no validation layer.

**Operational Implications:**
- Applications that allow high-frequency color changes (e.g., a color picker with live preview) will accumulate undisposed `ShaderMaterial` instances and `THREE.Color` objects each render cycle.
- To mitigate disposal, callers should pair each `useMemo` with a `useEffect` cleanup: `return () => material.dispose()`. This is not currently enforced by convention.
- Adding a new surface type (e.g., interior wall lining) requires only calling the appropriate factory function—no duplication of GLSL.

## Implementation

1. Export `makeSidingShader(color, sidingTexture)` and `makeRoofShader(roofColor, roofMaterial)` from `frontend/src/utils/shaders.js`. Each returns a plain config object `{ uniforms, vertexShader, fragmentShader }`.
2. In each consuming component, wrap the factory call in `useMemo` keyed to the relevant store values.
3. Add `useEffect` cleanup in each consumer to call `material.dispose()` when the memoized value changes, preventing GPU memory accumulation.
4. Document the disposal requirement in `shaders.js` with a JSDoc comment so future factory consumers are warned.
5. If per-frame uniform updates are needed (e.g., animated color transitions), refactor to create a stable `THREE.ShaderMaterial` instance in a `useRef` and mutate `uniforms.color.value` directly rather than recreating the material config.

## Related Decisions

**Required by**:
- **ADR-004** — Composable components each consume the shader factories independently; without centralization, the composable architecture would require coordinating five separate shader implementations

---

# ADR-003: Zustand Single Global Store for All Shed Configuration

## Revision log

| Date | Description |
|------|-------------|
| 2026-04-11 | Document created |

## Context

The shed configurator maintains a substantial configuration surface: dimensions (`width`, `length`), two roof pitch values, four color fields with an automatic/manual trim mode system, two material texture choices, a foundation, a porch object, a `placements` array, and a derived `price`. All 3D components and all UI control components must read from and write to the same configuration simultaneously. The choice of state architecture directly determines component coupling, re-render scope, and persistence complexity.

## Decision

We will store all shed configuration in a single flat Zustand store defined in `frontend/src/store/shedStore.js`, exposing one setter per field and three placement management actions (`addPlacement`, `removePlacement`, `updatePlacement`). The store is the sole source of truth; no component holds authoritative configuration state locally.

## Consequences

**Benefits:**
- Every 3D component and every UI control subscribes to the same object. Configuration changes from the control panel are reflected in the 3D canvas without prop threading or context nesting.
- The `useDesignPersistence` hook can implement save and load by calling `getConfig()` once and then calling individual setters on load, with no orchestration logic in any component.
- Resetting the entire shed to defaults requires one `reset()` call that sets all fields simultaneously in a single Zustand `set()` invocation, avoiding partial-state flicker.
- Zustand's selector pattern (`useShedStore((s) => s.trimColor)`) means a component that only reads `trimColor` will not re-render when `width` changes.

**Tradeoffs:**
- `wallHeight` is not stored in the store. It is a computed local constant (`WALL_HEIGHTS = 8`) inside `GableShed.jsx` and `BarnShed.jsx`. Components that need wall height—including `ShedWall`, `Porch`, and the CSG system—receive it as a prop from the parent shed component rather than reading it from the store. This is an identified inconsistency: if wall height ever becomes user-configurable, it requires both a store field addition and a prop-threading audit across all consumer components.
- The `price` field is stored in the store but is also recomputed on demand via `getPrice()`, which calls `calculateTotalPrice` directly. The store therefore contains both a persisted `price` (potentially stale) and a live computed price, with no enforcement that they match.
- The `placements` array stores all openings for all walls in a single flat array. Each wall filters it at render time: `placements.filter((p) => p.wall === side)`. A large number of placements will cause every `ShedWall` instance to execute a filter on every store update, regardless of whether that wall's placements changed.
- There is no middleware for undo/redo. Once a user deletes a placement or resets the design, the state is unrecoverable within the session.

**Operational Implications:**
- The `useDesignPersistence` hook destructures 17 setters from the store on every render. This is a design smell: a `restoreConfig(config)` action on the store would allow the hook to call one action instead.
- `getPlacements(wall)` is defined as a store method that calls `useShedStore.getState()` internally—it is not a React hook and cannot be used reactively. Components must use `useShedStore((s) => s.placements.filter(...))` for reactive wall-scoped placement reads.
- Adding a new configuration field requires: one store field, one setter, one entry in `reset()`, one entry in `getConfig()`, and conditional handling in `useDesignPersistence.load()`. This four-location update pattern should be enforced by a code review checklist.

## Implementation

1. Define all configuration fields as top-level keys in the Zustand `create()` call, keeping the store flat (no nested objects except the self-contained `porch` config object).
2. Provide one setter per field following the `setFieldName` convention.
3. Add `wallHeight` to the store with a default of `8` and wire it through the same setter pattern, resolving the current inconsistency where wall height is a local constant.
4. Add a `restoreConfig(config)` bulk action that sets all fields in one `set()` call, replacing the 17-setter pattern in `useDesignPersistence`.
5. Add a `history` middleware (e.g., using Zustand's `temporal` middleware) if undo/redo becomes a product requirement.

## Related Decisions

**Required by**:
- **ADR-001** — ShedWall reads placements from the store filtered by wall side; the flat array structure and filter pattern depend on the store's data shape
- **ADR-004** — Composable components each subscribe independently to the store; the single-store pattern is what makes independent subscription viable without prop drilling

---

# ADR-004: Composable Architecture — Each Shed Section Is Its Own Renderable Component

## Revision log

| Date | Description |
|------|-------------|
| 2026-04-11 | Document created |

## Context

A shed consists of structurally distinct sections: four walls, two gable ends (for gable-roof sheds), a roof, a foundation, and an optional porch. Early implementations rendered all sections from a single monolithic component, which made it difficult to swap roof styles, add optional features like the porch, or test individual sections in isolation. As the product added a second roof style (gambrel/barn) and an optional porch, the need for a more modular rendering model became clear.

## Decision

We will implement each shed section as a self-contained, independently renderable React component—`ShedWall`, `GableEnd`, `GableRoof`, `GambrelRoof`, `Porch`, `Skids`—and compose them inside thin orchestration components (`GableShed`, `BarnShed`) that assemble the correct set of section components for each shed style.

## Consequences

**Benefits:**
- `GableShed` and `BarnShed` are declarative assembly manifests. Their render bodies consist almost entirely of section component instantiations, making the structural difference between shed styles immediately readable in code.
- Section components can be developed, tested, and visually inspected independently. `Porch` can be mounted in a test scene with fixed props without needing a full shed around it.
- Adding a new optional section (e.g., a cupola, a dormer, a ramp) requires writing one new component and adding one conditional line to the relevant orchestration component, with no modifications to existing sections.
- `GableShed` iterates `WALL_SIDES` and renders four `ShedWall` instances with a `.filter()` on placements, keeping the orchestration component free of per-side conditional logic.
- The porch attaches to any wall side by accepting a `wall` prop and internally computing `groupPos` and `groupRot` from it. The orchestration component passes `porch.wall` and `porch.depth` from the store; the porch component owns the geometry-to-world alignment math.

**Tradeoffs:**
- Shared values—`wallHeight`, `shedWidth`, `shedLength`, `trimColor`, `sidingTexture`, `roofMaterial`—must be passed as props from orchestration components to each section. For a shed with four walls, two gable ends, a roof, and a porch, the same `color` and `sidingTexture` values are threaded to eight component instances. This is a prop-threading cost that grows linearly with new sections.
- `GableShed` reads `placements`, `trimColor`, `sidingTexture`, `roofMaterial`, and `porch` directly from the Zustand store. `BarnShed` does the same. This means both orchestration components are store-coupled, not purely presentational. A design that made `App.jsx` the only store consumer and passed all values down as props would be more testable but would require passing approximately 15 props to each shed component.
- The `wallHeight` inconsistency (see ADR-003) is directly caused by this architecture: wall height is needed by `ShedWall`, `GableEnd`, `GableRoof`, and `Porch`, but because it is not in the store, each orchestration component holds it as a local constant and passes it down. Making wall height configurable requires touching the orchestration component and all downstream section components.
- There is no shared interface (TypeScript interface or PropTypes) that enforces what a section component must accept. Different sections use slightly different prop names (e.g., `shedWidth` vs `width`), which increases the cognitive overhead of adding new sections.

**Operational Implications:**
- React Three Fiber re-renders a section component only when its own props change. Because `GableShed` uses selectors to read individual store slices, a `color` change triggers only the four `ShedWall` and two `GableEnd` re-renders—not the `Skids` or `GableRoof` re-renders.
- The `forwardRef` on `ShedWall` allows `GableShed` to expose the front wall's mesh reference via `onShedMeshReady`, enabling raycasting for placement interaction without tightly coupling the interaction system to the wall component.
- Section components should not import from the Zustand store directly. Configuration flows top-down through props. Only orchestration components (`GableShed`, `BarnShed`) are permitted to import the store.

## Implementation

1. Define section components (`ShedWall`, `GableRoof`, `GambrelRoof`, `GableEnd`, `Porch`, `Skids`) under `frontend/src/components/shed/` with subdirectories by type (`walls/`, `roofs/`, `extras/`).
2. Define orchestration components (`GableShed`, `BarnShed`) in `frontend/src/components/GableShed/` and `frontend/src/components/BarnShed/`. Each assembles the correct section components for its shed style.
3. Enforce the rule that section components receive all configuration through props and do not import `useShedStore`. Add a lint rule or code review checklist item to enforce this boundary.
4. Adopt a shared prop naming convention (`shedWidth`, `shedLength`, `wallHeight`) across all section components and update current deviations.
5. When adding a new optional section, add the feature flag to the store (e.g., `porch.enabled`), evaluate it in the orchestration component, and render the section component conditionally.

## Related Decisions

**Depends on**:
- **ADR-003** — Orchestration components read configuration from the single Zustand store; the composable model works because all sections share one source of truth rather than each maintaining independent state

**Implemented by**:
- **ADR-001** — Per-wall local-space CSG is the mechanism that makes `ShedWall` self-contained and independently renderable
- **ADR-002** — The shader factory pattern is the mechanism that gives each section component access to consistent materials without direct coupling to sibling components

---

# ADR-005: CSG Performance Ceiling and Web Worker Viability

## Revision log

| Date | Description |
|------|-------------|
| 2026-04-11 | Document created |

## Context

CSG Boolean subtraction using `three-bvh-csg`'s `Evaluator.evaluate()` runs synchronously on the main browser thread. The current architecture triggers a full CSG evaluation in a `useEffect` inside `ShedWall` whenever `placements`, `baseGeometry`, `localGeomWidth`, or `wallHeight` changes. With four walls and multiple placements, any dimension change causes up to four simultaneous synchronous CSG evaluations. As the configurator adds more placement types (standard door, garage door, barn door, window) and supports larger sheds (20×24 ft), the blocking time on the main thread grows proportionally and directly degrades frame rate and UI responsiveness.

## Decision

We will document the current synchronous CSG implementation as the baseline and define the conditions under which a Web Worker offload becomes necessary, along with the concrete implementation requirements for that migration.

## Consequences

**Benefits:**
- The current synchronous model is simple: no message passing, no geometry serialization, no worker lifecycle management. For the documented performance envelope (5–10 placements, 8×16 ft shed), it achieves 60 FPS because each `Evaluator.evaluate()` call completes in approximately 50–100 ms and React batches the state update.
- Keeping CSG on the main thread means the geometry result is immediately available in the same execution context as Three.js, requiring no deserialization step.

**Tradeoffs:**
- Every call to `Evaluator.evaluate()` blocks the main thread for its full duration. At 5 placements across 4 walls (20 total evaluations) triggered by a single dimension slider drag event, the combined blocking time can reach 2000 ms, dropping the frame rate to near zero during the evaluation burst.
- `useEffect` with `placements` as a dependency fires on every store update that changes the placements array reference, even if the actual placement data is identical. Zustand's immutable update pattern creates a new array reference on every `addPlacement` or `updatePlacement` call, which can cause spurious re-evaluations.
- There is no debounce or throttle on the CSG `useEffect`. Dragging a dimension slider fires the effect on every intermediate slider value, not just on release. At 120 Hz input polling, this can trigger hundreds of CSG evaluations per second.

**Operational Implications:**
- The practical ceiling under the current synchronous model is approximately 10 total placements with shed dimensions below 16×20 ft on a mid-range laptop. Beyond this, users will experience visible frame drops during dimension changes.
- The immediate mitigation requiring no architecture change is to debounce dimension inputs: delay the store update until 150 ms after the last slider event. This prevents CSG from firing on intermediate values during a drag.

## Implementation

**Immediate mitigations (no architecture change):**

1. Debounce `setWidth` and `setLength` calls in `DimensionsSection.jsx` with a 150 ms trailing debounce. This reduces dimension-change-triggered CSG evaluations from O(frames during drag) to O(1) per drag gesture.
2. Memoize the placement filter in `GableShed.jsx` with `useMemo`: `const wallPlacements = useMemo(() => placements.filter((p) => p.wall === side), [placements, side])`. This prevents `ShedWall` from re-rendering when the placement array reference changes but the filtered result is identical.

**Web Worker migration (required when ceiling is exceeded):**

3. Serialize geometry for transfer: `three-bvh-csg`'s `Evaluator` operates on `THREE.BufferGeometry` objects, which cannot be transferred directly to a Worker. The migration requires converting `BufferGeometry` to transferable `ArrayBuffer` objects using `geometry.attributes.position.array.buffer` and reconstructing them inside the worker.
4. Create `frontend/src/workers/csgWorker.js` that imports `three-bvh-csg` and `three`, accepts a `{ baseGeometryBuffers, placements, side, shedDimensions }` message, performs all placements for one wall sequentially, and posts back the result geometry buffers.
5. Instantiate one Worker per wall side (four workers total) in `ShedWall` using `useMemo`, so each wall's CSG runs in parallel rather than sequentially on the main thread. Use `worker.postMessage(data, [transferables])` with the `Transferable` array to avoid copying geometry data.
6. Replace the synchronous `useEffect` CSG block in `ShedWall` with an async message dispatch: post geometry and placements to the worker, then apply the returned geometry buffers in the message handler via `setModifiedGeometry`.
7. Add a loading state to `ShedWall` so the previous geometry remains visible while the worker computes the new one, preventing a flash of uncut geometry during the async transition.
8. Handle worker errors by falling back to the synchronous evaluator inline, preserving the graceful-degradation behavior of the current implementation.

## Related Decisions

**Depends on**:
- **ADR-001** — The local-coordinate-space CSG approach defined in ADR-001 is a prerequisite for the Web Worker design: because each wall's geometry and placements are self-contained, each wall's CSG job can be dispatched to an independent worker without cross-wall coordination
- **ADR-004** — The per-wall component boundary defined in ADR-004 is what makes per-wall worker parallelism possible; a monolithic CSG approach would require a single worker and sequential processing

---

# ADR-006: Style-Specific Trim as Separate Components (GableTrim / BarnTrim)

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
