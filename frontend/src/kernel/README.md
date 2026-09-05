# kernel

The Rust geometry kernel (`shed-cad-rs`), compiled to WebAssembly.

`pkg/` is generated and gitignored. Build it before `npm run dev`:

```sh
cd ../../wasm
tools/build-wasm.sh --target web --out ../threejs/shed_app/frontend/src/kernel/pkg
```

The `wasm-bindgen` CLI has to match the `wasm-bindgen` crate version exactly;
the build script checks and tells you the command if it does not.

Import from `../kernel`, never from `../kernel/pkg` — `index.js` is what
guarantees the module is initialised before any export is called.

## What is routed through the kernel

| File | Routed | Still JavaScript |
|---|---|---|
| `utils/wallOpenings.js` | `wallSpan`, `openingTransform`, `cutOpenings` | — |
| `utils/coordinateUtils.js` | `getWallFromIntersection`, `getWallNormalizedCoordinates` | — |
| `utils/gableEndOpenings.js` | `octagonOpening`, `octagonEnds` | `octagonForEnd`, which reads two Options out of a Design |
| `utils/modelSpec.js` | `wallHeightFt`, `roofRiseFt`, `peakHeightFt` | the `MODEL_SPEC` table |
| `utils/roofGeometry.js` | every live export | the prism-era half, which has no callers |
| `utils/trimGeometry.js` | every export but `eaveFasciaDrop` | see below |
| `utils/placementValidator.js` | `validatePlacement`, `checkOverlap`, `checkPlacementConflicts` | the id/type check, which is identity and not geometry |

`cutOpenings` no longer runs a CSG boolean. It calls `wallPanelForSpan` and
wraps the result in a `THREE.BufferGeometry`, keeping its old signature so its
callers did not have to move. This is what ADR-0001 is about. `Brush`,
`SUBTRACTION` and the module-level `Evaluator` are dead where they stand, and
`three-bvh-csg` is now used only by `wallOpenings.test.js`, for
`computeMeshVolume` as a test helper.

Routing `placementValidator.js` **changed an answer on purpose**, and it is the
only routing that did. The kernel measures a left or right wall against the
wall's own span where this app measured it against the shed's `length`, so a
door within six inches of a side-wall corner is now cautioned instead of passing
silently — upstream issue #17, in the validator rather than the transform. The
dialog's wording moved with it (`width is off the wall: 1.4`, not `Invalid X
coordinate: 1.4`). Front and back walls are unaffected: their span is the shed
width. No frozen render moved; the validator only feeds a dialog.

### Nothing is two implementations any more

`cornerBoards` was the last one, and it moved with its callers: `BarnTrim` now
passes the roof's top line as `{ kind: 'roof-underside', topLine, roofThickness }`
instead of a `topAt` closure, and `GableTrim` passes nothing, which is level.
The three-term expression the Barn used to compose here — `wallHeight +
bandUnderside(topLine)(x) - ROOF_THICKNESS` — is in the kernel now, beside the
geometry it belongs to. Boards come back keyed by `id`, which is what both
callers use for their React keys.

**`eaveFasciaDrop` is a deliberate exception and is not going to move.** It is
`RAKE_REVEAL * Math.hypot(1, slope)`, the one function here where routing would
change a number: `Math.hypot` is implementation-approximated, V8's compensated
sum is not correctly rounded and Rust's `f64::hypot` is, so the answers differ
in the last bit. The kernel has it (`eave_fascia_drop`) and uses it internally;
it is not exported, because exporting it would move a value for no gain. The
difference is 1.8e-15 ft, measured against the frozen renders, and moves no
pixel.

Where the kernel's vocabulary differs from this app's, the translation lives in
the wrapper and not in the kernel: `barnRakeFlashing` renames the kernel's
`fly-*` back to `rake-*`, and `roofRidgeCap` puts back the `kind` field its
callers switch on. Both are noted where they happen.
