# CSG Performance Ceiling and Web Worker Viability


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
