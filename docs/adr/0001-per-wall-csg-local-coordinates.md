# Per-Wall CSG in Local Coordinate Space


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
