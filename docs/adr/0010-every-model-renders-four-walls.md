# Every Model Renders Four Walls

## Revision log

| Date | Description |
|------|-------------|
| 2026-08-25 | Document created |

## Context

`BarnShed` rendered two `ShedWall` components, left and right only:

```js
// Front/back faces are provided by GambrelRoof's ExtrudeGeometry end-caps (siding material).
// Rendering front/back ShedWalls would create Z-fighting with those end-caps.
const WALL_SIDES = ['left', 'right'];
```

The barn's front and back were drawn instead by two flat `BoxGeometry` panels inside `GambrelRoof` — `barnWallFront` and `barnWallBack`, 0.01 ft thick, offset 0.01 ft proud of the roof end-caps to keep the two surfaces apart.

`ShedWall` is the component that cuts CSG openings and renders the door object, the trim frame and any shutters for the Placements it is given. Those flat panels do none of that. A Placement naming `wall: 'front'` on a Barn was filtered against a two-entry list, matched nothing, and was discarded in silence: no hole, no door, no frame, no warning.

`GableShed` has always rendered all four sides, so the Gable was unaffected.

This surfaced while scoping the removal of the reference-match fork (issue #4). The barn fidelity target, `ref_barn_barndoors.jpg`, is a barn whose defining feature is a pair of front barn doors — precisely what the real components could not draw. The fork's `BarnDoors.jsx` hand-places its doors at `HALF_L + 0.12` rather than using a Placement, which is why the fork existed at all and why it could not simply be deleted.

The stated reason for the two-wall list does not hold. The gambrel end-caps cover the roof profile only, from `wallHeight` upward; a front or back wall covers floor to eave. They are disjoint in Y and meet at the eave line, so there is no coplanar surface to Z-fight. `GambrelRoof` was already drawing panels in exactly that space and handling it with a 0.01 ft offset.

## Decision

Every Model renders four walls. `BarnShed` maps the same four sides as `GableShed`, and the flat `barnWallFront` / `barnWallBack` panels are removed from `GambrelRoof`.

The wall list and the routing of Placements onto it move into `frontend/src/utils/wallSides.js`, shared by both orchestration components:

- `WALL_SIDES` — the four wall ids, matching the `wall` field of a Placement.
- `routePlacements(placements, sides)` — returns `byWall` plus a `dropped` array holding any Placement naming a wall that is not being rendered.

`dropped` exists so that losing an opening is a reportable event rather than an absence. A test asserts it stays empty for a Design carrying a door on each of the four walls.

Above the eave, the Models keep their differences: a Gable has two `GableEnd` triangles, a Barn has the gambrel end-caps. That is the part which is genuinely per-Model.

## Consequences

**Benefits:**
- A customer can put a door or window on any side of any shed, which is what `CONTEXT.md` means by a Placement — the wall a Placement names is always a wall that exists.
- The barn reference target becomes reachable through the real components, unblocking issue #4 and then #5.
- The two Models now differ only above the eave, so the walls, their openings and their trim have one code path instead of two.
- Barn corners are closed. Left and right walls span `shedLength - 2 * WALL_THICKNESS`, expecting front and back walls to fill the remaining half-foot at each end. With no front or back wall, a Barn had a 0.5 ft gap at each corner covered only by a 0.01 ft panel.
- Front and back walls are real 0.5 ft slabs rather than 0.01 ft planes, so they take a CSG cut with actual depth and read correctly at a grazing angle.

**Tradeoffs:**
- A Barn now runs CSG on up to four walls instead of two. ADR-005's performance ceiling applies to twice as many surfaces; the practical limit of 5–10 placements per shed is unchanged, but it is now reachable on four walls rather than two.
- Two more wall meshes per Barn, each with its own `baseGeometry` and shader material.

**Operational Implications:**
- `routePlacements` is memoised on `placements` in both shed components. `ShedWall`'s cut is keyed on the array it is handed, so the previous `placements.filter(...)` — a fresh array on every render — re-cut every opening on every render. Routing once per change of the Placement list removes that.
- A future Model that genuinely lacks a wall passes a shorter `sides` list to `routePlacements` and must decide what to do with `dropped`. It must not narrow the list silently.

## Implementation

1. Add `frontend/src/utils/wallSides.js` exporting `WALL_SIDES` and `routePlacements`, with `byWall` built on a null-prototype object so a Placement naming `constructor` cannot be routed to an inherited property.
2. `BarnShed.jsx`: import `WALL_SIDES`, delete the local two-entry list, and hand each `ShedWall` its `byWall[side]` from a memoised `routePlacements`.
3. `GableShed.jsx`: same, replacing its own local list and per-wall `filter`.
4. `GambrelRoof.jsx`: remove the `barnWallFront` and `barnWallBack` meshes and the `WALL_PANEL_OFFSET` constant. Keep the end-caps, which still cover the roof profile.
5. `wallSides.test.js` covers the invariant: every wall a customer can choose is rendered, and a Design with a door on each of the four walls drops nothing.

## Related Decisions

**Implements:**
- **ADR-007** — a Placement is how an Option is positioned on the shed; this makes the wall it names always renderable, so an Option with a Placement on any side resolves to real geometry.

**Extends:**
- **ADR-001** — the per-wall local-space cut now runs on four walls of a Barn rather than two. The coordinate rule is unchanged; more walls follow it.
- **ADR-004** — `BarnShed` and `GableShed` remain the orchestration components that own composition; the wall list they compose from is now shared rather than declared twice.

**Constrained by:**
- **ADR-005** — the CSG performance ceiling. Doubling a Barn's cut surfaces spends part of that budget.

## Notes

Fixing the drop revealed that the openings did not render on any wall of either Model: `three-bvh-csg`'s `Evaluator` requires `Brush` operands and `ShedWall` was passing `THREE.Mesh`, so every cut threw and was swallowed by a `catch` (issue #25). That is recorded separately; this decision is about which walls exist, not about whether the cut works.
