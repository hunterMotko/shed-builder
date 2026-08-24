# Composable Architecture — Each Shed Section Is Its Own Renderable Component


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
