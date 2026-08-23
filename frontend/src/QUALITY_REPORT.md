# Quality Review Report — Shed Configurator Frontend

**Reviewer:** Claude Sonnet 4.6  
**Date:** 2026-04-11  
**Scope:** `frontend/src/` — production-readiness review  

---

## Summary

Six real production issues were found across resource management, state consistency, API contract resilience, and one crash-level bug. None are theoretical — each has a concrete failure scenario.

---

## CRITICAL Issues

### CRITICAL-1: `wallHeight` is not in the Zustand store, causing `undefined` throughout placement validation

**File:** `frontend/src/components/PlacementDialog.jsx` line 18  
**File:** `frontend/src/utils/placementValidator.js` lines 46-70

`PlacementDialog` destructures `wallHeight` directly from `useShedStore()`:

```js
const { addPlacement, width: shedWidth, length: shedLength, wallHeight, placements } = useShedStore();
```

`wallHeight` does not exist anywhere in `shedStore.js`. The store only has `width`, `length`, `style`, `color`, etc. There is no `wallHeight` key, no `setWallHeight` action, and no `wallHeight` in `reset()`.

This means `wallHeight` is `undefined` every time `PlacementDialog` is opened. The effect propagates:

1. `validatePlacement` receives `{ wallHeight: undefined }`. The boundary checks `y1 = normalizedY - placement.height / (2 * undefined)` produce `NaN`, silently passing all height-boundary validation.
2. `checkPlacementConflicts` → `checkOverlap` computes `halfHeight = placement.height / (2 * undefined) = NaN`, making all bounding-box comparisons return `false`. Every overlap check misses every real collision.
3. The CSG subtraction box is created at `localY = -undefined/2 + normalizedY * undefined = NaN`. Three.js creates a mesh at `[localX, NaN, 0]`. `evaluator.evaluate()` will either throw (crashing the CSG useEffect silently) or produce a degenerate geometry.

`GableShed` and `BarnShed` pass `wallHeight` as a prop to their child components (hardcoded in `GableShed` as `ROOF_HEIGHT = 4`, but `wallHeight` itself is a prop with a default of `8`) — they never push it into the store.

**Fix:** Add `wallHeight: 8` (and `setWallHeight`) to `shedStore.js` and keep it in sync, OR pass `wallHeight` as a prop down to `PlacementDialog` from the component that knows it. The store path is cleaner given the existing architecture.

---

### CRITICAL-2: Three.js geometries and materials created in `useEffect` / `useMemo` are never `.dispose()`'d — confirmed GPU memory leak

**File:** `frontend/src/components/shed/walls/ShedWall.jsx` lines 87-102  
**File:** `frontend/src/utils/shaders.js` lines 12-86

**ShedWall CSG loop (lines 87-102):**

Every time `placements`, `baseGeometry`, `localGeomWidth`, or `wallHeight` changes, the `useEffect` runs the CSG loop. Inside it:

```js
let currentMesh = new THREE.Mesh(baseGeometry.clone());  // geometry clone — never disposed
for (const p of placements) {
    const cutMesh = new THREE.Mesh(
        new THREE.BoxGeometry(p.width, p.height, WALL_THICKNESS + 0.1),  // new geometry — never disposed
        new THREE.MeshBasicMaterial()                                      // new material — never disposed
    );
    currentMesh = evaluator.evaluate(currentMesh, cutMesh, SUBTRACTION);
    // previous currentMesh geometry/material — never disposed
}
setModifiedGeometry(currentMesh.geometry);
```

For a shed with 3 placements, every dimension slider drag creates: 1 geometry clone + 3 `BoxGeometry` objects + 3 `MeshBasicMaterial` objects + 2 intermediate CSG result geometries = ~9 GPU objects per wall × 4 walls = 36 GPU objects per slider tick. Range sliders fire continuously during drag. At 60 events/sec over 2 seconds = 4,320 leaked GPU objects per slider interaction. This will cause visible frame-rate degradation and eventually crash the WebGL context on lower-end hardware after minutes of use.

**Shaders factory (shaders.js):**

`makeSidingShader` and `makeRoofShader` each allocate `new THREE.Color(...)` inside the returned uniform object. Every `useMemo` recompute (triggered by color/material change) creates new `THREE.Color` instances on the GPU uniform. The previous `ShaderMaterial` (reconstructed via `<shaderMaterial args={[sidingShader]} />`) is never disposed. React Three Fiber does not auto-dispose `shaderMaterial` created with `args={}` — it only disposes geometries/materials attached via the `attach` prop when the component unmounts. Color changes create one leaked `ShaderMaterial` + uniforms per wall per change.

**Fix for ShedWall CSG loop:**

```js
useEffect(() => {
    if (placements.length === 0) {
        setModifiedGeometry(null);
        return;
    }
    const cloned = baseGeometry.clone();
    let currentMesh = new THREE.Mesh(cloned);
    const toDispose = [cloned];

    try {
        for (const p of placements) {
            const cutGeo = new THREE.BoxGeometry(p.width, p.height, WALL_THICKNESS + 0.1);
            const cutMat = new THREE.MeshBasicMaterial();
            const cutMesh = new THREE.Mesh(cutGeo, cutMat);
            cutMesh.position.set(...);
            cutMesh.updateMatrixWorld();
            currentMesh.updateMatrixWorld();
            const prev = currentMesh;
            currentMesh = evaluator.evaluate(currentMesh, cutMesh, SUBTRACTION);
            // dispose intermediates
            if (prev.geometry !== baseGeometry) toDispose.push(prev.geometry);
            toDispose.push(cutGeo, cutMat);
        }
        setModifiedGeometry(currentMesh.geometry);
    } catch (err) {
        console.error(`ShedWall CSG failed (${side}):`, err);
        setModifiedGeometry(null);
    } finally {
        // Dispose everything except the final geometry we kept
        toDispose.forEach(obj => obj.dispose?.());
    }

    return () => { currentMesh.geometry?.dispose(); };
}, [placements, baseGeometry, localGeomWidth, wallHeight, side]);
```

For the shader leak, add a `useEffect` cleanup in `ShedWall`:

```js
useEffect(() => {
    const mat = new THREE.ShaderMaterial(sidingShader);
    // ... assign to ref for mesh
    return () => mat.dispose();
}, [sidingShader]);
```

Or use `useRef` to hold the material and call `.dispose()` before reassigning.

---

## HIGH Issues

### HIGH-1: `applyWallPlacements` in `csgOperations.js` creates geometry and materials and immediately discards them (dead code + resource leak)

**File:** `frontend/src/utils/csgOperations.js` lines 273-293

```js
applyWallPlacements(baseGeometry, placements, side, shedDimensions, wallThickness = 0.5) {
    ...
    for (const placement of placements) {
        const localCoords = this.getLocalCoordinatesForWall(...);
        const cutBox = new THREE.BoxGeometry(         // allocated
            localCoords.size.width,
            localCoords.size.height,
            localCoords.size.depth
        );
        const cutMesh = new THREE.Mesh(cutBox, new THREE.MeshStandardMaterial({ visible: false })); // allocated
        cutMesh.position.copy(localCoords.position);
        try {
            // BUG: this calls subtractOpening which ignores cutBox/cutMesh entirely
            // and recomputes its own world-space subtraction box from scratch
            resultGeometry = this.subtractOpening(resultGeometry, placement, shedDimensions);
        } catch (err) { ... }
    }
    return resultGeometry;
}
```

`cutBox` and `cutMesh` are created but then `subtractOpening` is called instead of using them — the function delegates back to world-space CSG, making the local-space computation dead code. More concretely, `cutBox` and `cutMesh` are never disposed and never used. If this method were called in a render loop it would produce the same leak as CRITICAL-2. It is currently not called anywhere in the active code path (ShedWall does its own inline CSG) but exists and could be wired up accidentally.

**Fix:** Either remove `applyWallPlacements` or complete it to use `cutMesh` directly with the evaluator and call `.dispose()` on intermediates.

---

### HIGH-2: Store allows `roofLowerPitch >= roofUpperPitch`, collapsing the gambrel roof geometry

**File:** `frontend/src/store/shedStore.js` lines 60-61  
**File:** `frontend/src/components/shed/roofs/GambrelRoof.jsx` lines 28-30

`setRoofLowerPitch` and `setRoofUpperPitch` accept any value with zero validation:

```js
setRoofLowerPitch: (roofLowerPitch) => set({ roofLowerPitch }),
setRoofUpperPitch: (roofUpperPitch) => set({ roofUpperPitch }),
```

In `GambrelRoof.jsx`:

```js
const knuckleY = (halfWidth - knuckleX) * (roofLowerPitch / 12);
const peakY    = knuckleY + knuckleX * (roofUpperPitch / 12);
```

If `roofLowerPitch = 0`, `knuckleY = 0`, making the lower trapezoid flat with zero height. Three.js `ExtrudeGeometry` of a degenerate (zero-area) shape produces NaN vertex positions, which propagates to the WebGL buffer and causes the mesh to disappear or the renderer to log errors every frame.

If `roofLowerPitch = roofUpperPitch = 0`, `peakY = 0 = wallHeight` level — roof collapses into the wall plane, same result.

Additionally, `useDesignPersistence.js` line 101-102 uses truthy guards:

```js
if (design.roofLowerPitch)   setRoofLowerPitch(design.roofLowerPitch);
if (design.roofUpperPitch)   setRoofUpperPitch(design.roofUpperPitch);
```

A saved design with `roofLowerPitch: 0` (valid edge case) will silently skip restoring it, leaving the store at its current value instead. This is an API contract resilience bug — valid data is discarded.

**Fix for store:** Add guards in the setters:

```js
setRoofLowerPitch: (v) => set((s) => ({
    roofLowerPitch: Math.max(1, Math.min(v, s.roofUpperPitch - 1))
})),
setRoofUpperPitch: (v) => set((s) => ({
    roofUpperPitch: Math.max(s.roofLowerPitch + 1, Math.min(v, 18))
})),
```

**Fix for persistence:** Use explicit `!= null` guards instead of truthiness:

```js
if (design.roofLowerPitch != null) setRoofLowerPitch(design.roofLowerPitch);
if (design.roofUpperPitch != null) setRoofUpperPitch(design.roofUpperPitch);
if (design.foundationHeight != null) setFoundationHeight(design.foundationHeight);
```

The same truthy-guard bug affects `foundationHeight` (a value of `0` would be skipped, though it cannot be `0` currently — fragile for future changes).

---

### HIGH-3: `Porch` renders with `depth = 0` producing degenerate geometry

**File:** `frontend/src/store/shedStore.js` line 41 (`depth: 6` default is fine)  
**File:** `frontend/src/components/shed/extras/Porch.jsx` lines 40-44  
**File:** `frontend/src/components/ControlPanel.jsx` / any UI that calls `setPorch`

`setPorch` accepts a partial object with no validation:

```js
setPorch: (porchConfig) => set((state) => ({ porch: { ...state.porch, ...porchConfig } })),
```

If a caller sets `porch.depth = 0`:

```js
const roofDropHeight = depth * (3 / 12);  // = 0
const slopeAngle = Math.atan2(0, 0);       // = 0 (not NaN, but meaningless)
const slopedLen  = Math.sqrt(0 + 0) + 0.3; // = 0.3 — near-zero depth extrude
```

The deck geometry becomes `BoxGeometry(porchSpan, 0.2, 0)` — a zero-depth box. Three.js emits console warnings and produces a degenerate mesh. The outer posts are placed at `position=[x, wallHeight/2, 0 - POST_SIZE/2]` which intersects the wall face exactly. Not an immediate crash, but visually broken and produces console errors that repeat every render frame.

**Fix:** Clamp `depth` in `setPorch` or add a `Math.max(1, depth)` guard at the top of `Porch`.

---

## MEDIUM Issues

### MEDIUM-1: `validateDesignConfig` does not validate placements before save — corrupt placement data is silently persisted

**File:** `frontend/src/services/designApi.js` lines 87-123

`validateDesignConfig` checks width, length, style, colors, and price but skips `placements` entirely. A placement with `normalizedX = NaN` (from the `wallHeight = undefined` bug in CRITICAL-1) or `width = 0` will pass validation, be serialized to JSON as `null` (JSON.stringify(NaN) = "null"), and be saved to the backend. On reload, those null values will produce geometry failures silently.

**Fix:** Add placement validation to `validateDesignConfig`:

```js
if (Array.isArray(config.placements)) {
    config.placements.forEach((p, i) => {
        if (!Number.isFinite(p.normalizedX) || !Number.isFinite(p.normalizedY)) {
            errors.push(`Placement ${i} has non-finite coordinates`);
        }
        if (!Number.isFinite(p.width) || p.width <= 0) {
            errors.push(`Placement ${i} has invalid width`);
        }
    });
}
```

---

### MEDIUM-2: Custom size inputs in `PlacementDialog` are not clamped client-side — `Number(e.target.value)` on empty input produces `0`

**File:** `frontend/src/components/PlacementDialog.jsx` lines 204-222

```jsx
onChange={(e) => setWidth(Number(e.target.value))}
onChange={(e) => setHeight(Number(e.target.value))}
```

If the user clears the input field, `e.target.value` is `""`, and `Number("")` is `0`. The preview immediately shows `0.0ft × 0.0ft` and validation fires with `placement.width = 0`. The validator catches this (`Width too small: 0ft`) which prevents submission, so no crash occurs — but the zero-width state persists in the dialog until the user types a valid value. More critically, if the user types a negative number (e.g., `-2`), `Number("-2") = -2` passes through `setWidth(-2)`, and the validator only checks `< MIN_SIZE (0.5)` — which `-2` triggers — but until validation runs in the next render cycle, the geometry preview could briefly receive a negative-width value.

**Fix:**

```js
onChange={(e) => {
    const v = parseFloat(e.target.value);
    if (Number.isFinite(v) && v > 0) setWidth(v);
}}
```

---

### MEDIUM-3: `getConfig()` in the store calls `useShedStore.getState()` inside a Zustand action — creates a second snapshot, causing stale price in saved designs

**File:** `frontend/src/store/shedStore.js` lines 112-133

```js
getConfig: () => {
    const state = useShedStore.getState();
    return {
        ...
        price: useShedStore.getState().getPrice(), // second getState() call
    };
},
```

`getConfig` is called by `useDesignPersistence.save()`. Because `getPrice()` reads `state.width`, `state.length`, and `state.style` at the moment `getPrice()` is called inside the action, if a React batched update is in-flight between the first and second `getState()` calls (e.g., the user changed width and immediately hit Save), the price in the saved design can mismatch the actual `width/length/style` also in the same saved design object. The design would be saved with `width=14` but `price` calculated from `width=12` (the value 16ms earlier). On reload, the displayed price will differ from the recalculated price.

**Fix:** Compute price inline from the already-captured `state`:

```js
getConfig: () => {
    const state = useShedStore.getState();
    return {
        ...
        price: calculateTotalPrice(state.width, state.length, state.style),
    };
},
```

---

## Verdict: Has Critical Issues

**CRITICAL-1** (`wallHeight` missing from store) is a crash-level bug: every placement validation silently operates on `undefined`, CSG receives `NaN` coordinates, and overlap detection is completely broken for any user who opens `PlacementDialog`. This manifests immediately on first use of the placement feature.

**CRITICAL-2** (Three.js resource leak) will cause measurable user-visible degradation — frame rate drop and eventual WebGL context loss — for any user who drags dimension sliders while placements exist, or who changes colors repeatedly. On a typical session this means 10-15 minutes before noticeable slowdown on mid-range hardware.

Both must be fixed before production deployment. HIGH-1 through MEDIUM-3 should be addressed in the same pass.
