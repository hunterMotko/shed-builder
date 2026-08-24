# Zustand Single Global Store for All Shed Configuration


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
