# Debug Report — Shed Configurator Runtime Bugs

**Date:** 2026-04-11  
**Investigator:** Automated debugger (Claude Sonnet 4.6)  
**Scope:** Visual correctness bugs and silent failure modes in the React Three Fiber shed configurator.

---

## Bug 1 — DoorFrame trim pieces offset by half the opening height

**File:** `frontend/src/components/common/DoorFrame.jsx`  
**Lines:** 62–84

### What the bug is

The `<group>` position is set to the **center** of the door opening in world space. The four trim piece positions inside that group are calculated as if the group origin is the **top** of the opening. All four trim meshes render in the wrong location — displaced downward by `elemHeight / 2` relative to where they should be.

**Proof from the coordinate math:**

The group `position[1]` (Y component):
```
-wallHeight/2 + normalizedY * wallHeight
```
The wall mesh itself sits at world Y = `wallHeight / 2`. So the group's world Y resolves to:
```
wallHeight/2 + (-wallHeight/2 + normalizedY * wallHeight) = normalizedY * wallHeight
```

The CSG cut box center (in `ShedWall.jsx` line 91–92) is:
```
localY = -wallHeight/2 + normalizedY * wallHeight
```
which in wall world space is also `normalizedY * wallHeight`. The group origin **equals the opening center**.

With the group at the opening center, the correct local offsets for a centered frame would be:

| Piece | Correct Y offset | Actual Y offset | Error |
|---|---|---|---|
| Top trim | `+elemHeight/2` | `0` | `-elemHeight/2` |
| Bottom trim | `-(elemHeight/2 + trimWidth/2)` | `-(elemHeight + trimWidth)` | `-elemHeight/2` |
| Left trim center | `0` | `-elemHeight/2` | `-elemHeight/2` |
| Right trim center | `0` | `-elemHeight/2` | `-elemHeight/2` |

Every trim piece is displaced **downward by `elemHeight / 2`** from its correct position. For a standard 6.5 ft door this is a 3.25 ft displacement — the frame visually wraps the bottom half of the CSG cutout instead of the actual opening.

### Reproduction

1. Open the app, add a door to the front wall.
2. Observe that the trim frame appears shifted down: the top trim bar sits at the midpoint of the door opening and the bottom trim bar floats below the opening's floor level.

### Fix strategy

The four child mesh positions must be recalculated relative to the opening center (the group origin). The corrected positions:

```jsx
{/* Top trim — sits above opening top */}
<mesh position={[0, elemHeight / 2 + trimWidth / 2, 0]} castShadow>
  <boxGeometry args={[elemWidth + trimWidth * 2, trimWidth, trimWidth]} />
  ...
</mesh>

{/* Bottom trim — sits below opening bottom */}
<mesh position={[0, -(elemHeight / 2 + trimWidth / 2), 0]} castShadow>
  <boxGeometry args={[elemWidth + trimWidth * 2, trimWidth, trimWidth]} />
  ...
</mesh>

{/* Left trim — spans opening height centered at Y=0 */}
<mesh position={[-(elemWidth / 2 + trimWidth / 2), 0, 0]} castShadow>
  <boxGeometry args={[trimWidth, elemHeight + trimWidth * 2, trimWidth]} />
  ...
</mesh>

{/* Right trim — spans opening height centered at Y=0 */}
<mesh position={[elemWidth / 2 + trimWidth / 2, 0, 0]} castShadow>
  <boxGeometry args={[trimWidth, elemHeight + trimWidth * 2, trimWidth]} />
  ...
</mesh>
```

---

## Bug 2 — WindowFrame has the identical trim offset bug

**File:** `frontend/src/components/common/WindowFrame.jsx`  
**Lines:** 62–84

### What the bug is

`WindowFrame.jsx` is a pixel-for-pixel copy of `DoorFrame.jsx` including the same four incorrect child mesh positions (lines 63, 69, 75, 81). The group position calculation is identical (lines 23–54), making the group origin the center of the window opening. All four trim pieces are offset downward by `elemHeight / 2` for the same reason as Bug 1.

The only observable difference is that window openings are smaller (typically 2 × 3 ft), so the visual displacement is proportionally smaller but still clearly wrong: the top trim bar sits at the horizontal midline of the window opening.

### Fix strategy

Apply the identical fix described in Bug 1 to `WindowFrame.jsx` lines 62–84.

---

## Bug 3 — useDesignPersistence truthy guard silently skips falsy-but-valid numeric values on load

**File:** `frontend/src/hooks/useDesignPersistence.js`  
**Lines:** 93–98

### What the bug is

The `load()` function uses JavaScript truthy checks to guard optional fields before restoring them to the store:

```js
if (design.roofLowerPitch) setRoofLowerPitch(design.roofLowerPitch);
if (design.roofUpperPitch) setRoofUpperPitch(design.roofUpperPitch);
if (design.foundationHeight) setFoundationHeight(design.foundationHeight);
if (design.foundationColor) setFoundationColor(design.foundationColor);
if (design.price) setPrice(design.price);
```

JavaScript evaluates `0` as falsy. For numeric fields, any saved value of `0` causes the guard to silently skip the `set*` call, leaving the store at its previous (or reset) value rather than the saved value.

**Concretely affected field: `foundationHeight`.**  
The store has no minimum clamp on `foundationHeight` (line 67 of `shedStore.js`: `setFoundationHeight: (foundationHeight) => set({ foundationHeight })`). A user can save a design with `foundationHeight: 0` (foundation flush with ground). On load, `if (design.foundationHeight)` evaluates `if (0)` which is `false`, and `setFoundationHeight` is never called. The loaded design renders with the default `foundationHeight: 1.5` instead of `0`, making the shed appear to float 1.5 ft off the ground.

The `roofLowerPitch` and `roofUpperPitch` fields are clamped to `Math.max(1, ...)` by their setters, so a stored value of `0` cannot currently be produced by the UI — but they remain latent bugs if the API accepts 0 directly.

The `price` field is derived state (recalculated from dimensions) so silently skipping `price: 0` is a minor inconsistency rather than a user-visible error.

### Reproduction

1. Set `foundationHeight` to `0` in the store (or POST a design with `foundationHeight: 0` directly to the API).
2. Save the design — `getConfig()` serializes `foundationHeight: 0`.
3. Load the design by ID.
4. Observe the rendered shed has a 1.5 ft foundation instead of 0.

### Fix strategy

Replace all truthy guards on numeric fields with explicit `!= null` (or `!== undefined`) checks:

```js
// Before (line 93)
if (design.roofLowerPitch) setRoofLowerPitch(design.roofLowerPitch);

// After
if (design.roofLowerPitch != null) setRoofLowerPitch(design.roofLowerPitch);
```

Apply the same change to `roofUpperPitch`, `foundationHeight`, and `price`. For string fields like `trimColorMode`, `trimAutoMode`, `sidingTexture`, `roofMaterial`, and `foundationColor` the truthy guard is equivalent to checking for a non-empty string, which is the correct intent — those do not need changing.

---

## Bug 4 — PlacementDialog preset dropdown selection state desyncs from displayed width/height

**File:** `frontend/src/components/PlacementDialog.jsx`  
**Lines:** 64–70

### What the bug is

The `<select>` element for preset selection is a controlled component whose value is bound to `selectedPreset` state (line 169: `value={selectedPreset}`). The `onChange` handler is `handlePresetChange`:

```js
const handlePresetChange = (e) => {
  const preset = PRESETS_BY_TYPE[placementType][Number(e.target.value)];
  if (preset) {
    setWidth(preset.width);
    setHeight(preset.height);
  }
};
```

This handler updates `width` and `height` local state but **never calls `setSelectedPreset`**. Because the `<select>` value is controlled by `selectedPreset` (which remains unchanged), React re-renders the dropdown with its old `value`, visually snapping the selection back to the previous option. The user sees their selection disappear while the width/height numbers do change — an inconsistent UI state.

Additionally, the `useEffect` on lines 28–34 syncs `width`/`height` from the preset **when `selectedPreset` changes**, but since `handlePresetChange` never calls `setSelectedPreset`, that effect never fires on user selection. The only path to changing the preset index is the `useEffect` on line 37 (resets to 0 when `placementType` changes). Selecting preset index 1, 2, or 3 from the dropdown leaves `selectedPreset` stuck at 0 — but the width/height do update for that one render before React snaps the select back.

### Reproduction

1. Open the PlacementDialog (click a wall in 3D view).
2. Open the "Size Preset" dropdown, which shows multiple presets (e.g., "Standard 3×6.5", "Wide 4×7", etc.).
3. Select any preset other than the first.
4. Observe: the width/height preview updates momentarily then reverts to the first preset's values as React re-renders. The dropdown visually snaps back to the first option.

### Fix strategy

Add `setSelectedPreset(Number(e.target.value))` to `handlePresetChange`, and let the existing `useEffect` (lines 28–34) handle the `width`/`height` update from the new `selectedPreset` — or set all three states in the handler:

```js
const handlePresetChange = (e) => {
  const idx = Number(e.target.value);
  setSelectedPreset(idx);   // <-- add this line
  const preset = PRESETS_BY_TYPE[placementType][idx];
  if (preset) {
    setWidth(preset.width);
    setHeight(preset.height);
  }
};
```

---

## Bug 5 — ShedWall CSG: `currentMesh.updateMatrixWorld()` called after `cutMesh` but `currentMesh` accumulates a stale world matrix across iterations

**File:** `frontend/src/components/shed/walls/ShedWall.jsx`  
**Lines:** 87–101

### What the bug is

The CSG loop iterates over `placements`, replacing `currentMesh` with the result of `evaluator.evaluate(currentMesh, cutMesh, SUBTRACTION)` each iteration:

```js
let currentMesh = new THREE.Mesh(baseGeometry.clone());
for (const p of placements) {
  const localX = ...;
  const localY = ...;

  const cutMesh = new THREE.Mesh(...);
  cutMesh.position.set(localX, localY, 0);
  cutMesh.updateMatrixWorld();         // line 98
  currentMesh.updateMatrixWorld();     // line 99
  currentMesh = evaluator.evaluate(currentMesh, cutMesh, SUBTRACTION);  // line 100
}
```

`evaluator.evaluate()` from `three-bvh-csg` returns a **new** `THREE.Mesh` whose `matrixWorld` has NOT been initialized. On the next iteration, `currentMesh.updateMatrixWorld()` is called on this new mesh. `updateMatrixWorld()` traverses parent→child to compose transforms; the new mesh has no parent and its `matrix` is identity, so `matrixWorld` is identity — which is correct for the first cut but relies on `position` being `(0,0,0)`.

The actual problem: the returned mesh's `matrixAutoUpdate` is `true` by default, but `matrixWorld` is not valid until `updateMatrixWorld` is called at least once. Because the cut mesh in each iteration is positioned relative to the **base wall geometry's local origin** (correct), and the `currentMesh` is always at origin with identity matrix, this works for a single placement. However, for any placement after the first, the `evaluator.evaluate()` result mesh has `matrixWorld` as `identity` only by coincidence — Three.js sets `matrixWorld` to identity on `Mesh` construction, so it works, but this is fragile. If a future version of `three-bvh-csg` returns a mesh with a non-identity position (e.g., to account for bounding box offset), the subsequent cuts would be misaligned.

The more concrete present-day issue: `cutMesh.updateMatrixWorld()` is called **before** `currentMesh.updateMatrixWorld()` (lines 98–99). The `three-bvh-csg` evaluator requires both meshes to have up-to-date `matrixWorld` before `evaluate()` is called. The ordering is correct here. But the loop does NOT call `currentMesh.updateMatrixWorld()` for the **initial** `currentMesh` before the first iteration — only in iterations 2+ does the `currentMesh.updateMatrixWorld()` at line 99 apply. On iteration 1, the brand-new `THREE.Mesh(baseGeometry.clone())` has `matrixWorld = identity` from the constructor, so the first cut works correctly. The bug would only manifest if `three-bvh-csg` relies on `matrixWorld` being explicitly validated (via `updateMatrixWorld` flag semantics) rather than just reading the matrix value.

**Severity: Low / latent.** The current behavior is functionally correct because Three.js initializes `matrixWorld` to identity for new meshes with default position. Flag this for defensive hardening rather than immediate user-visible breakage.

### Fix strategy

Hoist a single `currentMesh.updateMatrixWorld(true)` call before the loop starts, and reset `matrixWorld` on the returned mesh at the top of each iteration:

```js
let currentMesh = new THREE.Mesh(baseGeometry.clone());
currentMesh.updateMatrixWorld(true);  // initialize before first use

for (const p of placements) {
  const localX = -localGeomWidth / 2 + p.normalizedX * localGeomWidth;
  const localY = -wallHeight / 2 + p.normalizedY * wallHeight;

  const cutMesh = new THREE.Mesh(
    new THREE.BoxGeometry(p.width, p.height, WALL_THICKNESS + 0.1),
    new THREE.MeshBasicMaterial()
  );
  cutMesh.position.set(localX, localY, 0);
  cutMesh.updateMatrixWorld(true);

  currentMesh = evaluator.evaluate(currentMesh, cutMesh, SUBTRACTION);
  currentMesh.updateMatrixWorld(true);  // ensure next iteration starts clean
}
```

---

## Summary Table

| # | File | Lines | Severity | Category |
|---|---|---|---|---|
| 1 | `components/common/DoorFrame.jsx` | 62–84 | High | Incorrect visual output — all trim pieces displaced by elemHeight/2 |
| 2 | `components/common/WindowFrame.jsx` | 62–84 | High | Same as Bug 1, identical code |
| 3 | `hooks/useDesignPersistence.js` | 93–98 | Medium | Silent failure — `foundationHeight: 0` not restored on load |
| 4 | `components/PlacementDialog.jsx` | 64–70 | Medium | UI desync — preset dropdown snaps back; selected preset not persisted to state |
| 5 | `components/shed/walls/ShedWall.jsx` | 87–101 | Low/Latent | Fragile CSG loop — missing explicit `updateMatrixWorld` before first cut |

---

## Out-of-scope areas investigated (no bugs found)

**`frontend/src/store/shedStore.js` — `wallHeight` presence:** `wallHeight` is present in the store (line 20, default `8`), has a setter with clamp on line 51, is included in `reset()` and `getConfig()`. No bug.

**`frontend/src/components/PlacementDialog.jsx` — `wallHeight` destructuring:** Line 18 correctly destructures `wallHeight` from `useShedStore()`. It is passed to `validatePlacement` and `checkPlacementConflicts`. No bug.

**`frontend/src/components/shed/extras/Porch.jsx` — `slopeAngle` and center Y:** `slopeAngle = Math.atan2(roofDropHeight, depth)` is geometrically correct. Positive X rotation in Three.js tilts the far (+Z) edge down and the near edge up, matching the desired lean-to direction (wall side higher, outer edge lower). The center Y `(roofHighY + roofLowY) / 2` is the correct arithmetic midpoint of the two edge heights. No bug.

---

*No debug statements or temporary files were added during this investigation. No cleanup required.*
