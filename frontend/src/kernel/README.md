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
| `components/shed/trim/*`, `components/shed/roofs/{Gable,Gambrel}Roof.jsx` | which pieces a Model carries — `trimSet`, `roofMetal` | the material and the primitive |
| `utils/placementValidator.js` | `validatePlacement`, `checkOverlap`, `checkPlacementConflicts` | the id/type check, which is identity and not geometry |

`cutOpenings` no longer runs a CSG boolean. It calls `wallPanelForSpan` and
wraps the result in a `THREE.BufferGeometry`, keeping its old signature so its
callers did not have to move. This is what ADR-0001 is about, and
**`three-bvh-csg` is gone** — the dependency, the shared `Evaluator`, the
`Brush` operands and the `computeMeshVolume` test helper. The volume assertions
that helper served are still there, over a signed-tetrahedron sum written out
in the test file, which needs no library and reads the winding as its sign.

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

### The components ask what a shed carries instead of listing it

`BarnTrim`, `GableTrim`, `GambrelRoof` and `GableRoof` each used to spell out
their own half of one product fact. CONTEXT.md puts the Trim Set in the Model
bundle and says "a Barn and a Gable do not carry the same set — that is a
difference in the product, not a difference in the renderer", so four listings
were three too many, and the kernel's bill of materials would have made five.
They call `trimSet` and `roofMetal` now. What is left in each component is the
material and the primitive: `boards` are outlines for `<ExtrudedBand>`, `parts`
are boxes, and a `ridge-glass-*` part is drawn in glass.

**Every frozen render is unchanged** — 12/12 at zero differing pixels, which is
what the boundary smoke test's piece-for-piece equivalence checks were written
to guarantee before the components moved.

Two things the components still pass rather than let the kernel derive, and one
is a bug in this app:

- **`wallHeight`.** The Model fixes it — 7.375 ft for both, from the stud
  length — and the reference targets use `wallHeightFt(model)`. But
  `ShedConfigurator` defaults to a flat `8`, and `Canvas3D` never passes one,
  so the configurator draws 8 ft walls while quoting a Peak Height off 7.375.
  Deriving in the kernel would have left routed corner boards seven inches
  short of unrouted walls. The kernel takes a stated `wallHeight` for that
  reason; the app's own default is what wants fixing.
- **`roofHeight` on `GableRoof`.** The slab still uses the prop; the metal
  derives the rise from the width. They agree because `GableShed` passes
  exactly `gableRoofRise(width)`, which is the same derivation — but nothing
  enforces it, and a caller passing its own roof would put the ridge cap off
  the slab.

Routing left seven per-piece wrappers in `trimGeometry.js` with no component
callers — `cornerBoards`, `gableFasciaBoards`, `gableCornerBoxes`,
`barnRakeFlashing`, `barnKnuckleFlashing`, `rakeJChannel` and `bandUnderside`.
They are not deleted: each still carries the property tests that say why its
geometry is what it is, and `Skylight.jsx` still calls `roofRidgeCap` directly
for the glass. Deleting them is a separate call, and it costs those tests.
