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

## Which kernel

`KERNEL.pin` names the commit this app is built and tested against, in the
private repo `hunterMotko/shed-cad-rs`. CI reads it, checks that revision out
and builds it; the command above is the same one, run by hand.

**Moving the pin is a commit here**, which is what makes "the app adopted a new
kernel" a change with a diff rather than a fact about whichever working tree
happened to be next door. It also lets the kernel move ahead without breaking
this repo's CI. The kernel's ADR-0003 has the reasoning, including why a
vendored `pkg/` was rejected: with no kernel source in CI, nothing there can
tell an artifact built from HEAD from one built six weeks ago, and the suite
goes green either way.

CI needs a credential to reach a private repo. `KERNEL_SSH_KEY` is a
**read-only deploy key** on the kernel and nothing else — narrower than a
personal access token, which would carry the whole account, and it does not
expire. The public half is in the kernel repo under Settings > Deploy keys, the
private half is this repo's Actions secret, and they are replaced together or
not at all. **If the checkout step fails with a permission error, that key is
why**, and the failure looks nothing like a kernel problem.

## What is routed through the kernel

| File | Routed | Still JavaScript |
|---|---|---|
| `utils/wallOpenings.js` | `wallSpan`, `openingTransform`, `cutOpenings` | — |
| `utils/coordinateUtils.js` | `getWallFromIntersection`, `getWallNormalizedCoordinates` | — |
| `utils/gableEndOpenings.js` | `octagonOpening`, `octagonEnds` | `octagonForEnd`, which reads two Options out of a Design |
| `utils/modelSpec.js` | `wallHeightFt`, `roofRiseFt`, `peakHeightFt` | the `MODEL_SPEC` table |
| `utils/roofGeometry.js` | every live export | the prism-era half, which has no callers |
| `utils/trimGeometry.js` | `trimSet`, `roofMetal`, `roofRidgeCap` — all that is left | — |
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

**`eaveFasciaDrop` was the one exception, and it is now moot.** It is
`RAKE_REVEAL * Math.hypot(1, slope)`, the one function here where routing would
have changed a number: `Math.hypot` is implementation-approximated, V8's
compensated sum is not correctly rounded and Rust's `f64::hypot` is, so the
answers differ in the last bit (1.8e-15 ft — measured, and it moves no pixel).
It was kept in JavaScript rather than routed for that reason. Once the fascia
was routed nothing called it, and it is deleted: there is one implementation
now, `eave_fascia_drop` inside the kernel, so there are no two answers left to
differ. The kernel still does not export it, and still should not.

Where the kernel's vocabulary differs from this app's, the translation lives in
the wrapper and not in the kernel: `roofRidgeCap` puts back the `kind` field its
callers switch on, and the over-long-skylight report the kernel hands back
beside the pieces rather than on one of them. Both are noted where they happen.
`barnRakeFlashing` used to do the same for `fly-*` / `rake-*` and is gone with
the rest; the components read the kernel's own names now.

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

- **`wallHeight`.** Every live caller passes `wallHeightFt(model)` — `App.jsx`
  and the reference targets both — so it is the Model's own value and the
  kernel could derive it with no change. It is passed because the components
  place the walls, the Openings and the ends with the height they were handed,
  and trim that measured its own wall would be nailed to a different one the
  day the two part company. Discarding an argument a caller passed is a worse
  trap than honouring it.
- **`roofHeight` on `GableRoof`.** The slab still uses the prop; the metal
  derives the rise from the width. They agree because `GableShed` passes
  exactly `gableRoofRise(width)`, which is the same derivation — but nothing
  enforces it, and a caller passing its own roof would put the ridge cap off
  the slab.

### What routing made dead, and where its tests went

`trimGeometry.js` went from 500 lines to 110. Deleted: the seven per-piece
wrappers routing left without callers (`cornerBoards`, `gableFasciaBoards`,
`gableCornerBoxes`, `barnRakeFlashing`, `barnKnuckleFlashing`, `rakeJChannel`,
`bandUnderside`), the two pieces of real band geometry only they used
(`mitredBand` and `bandUnderside` — the last parallel implementation of
anything on this side), their private helpers, `eaveFasciaDrop`, and the six
trim-stock constants. `trimStock()` is the kernel's answer for those numbers.
What remains is `trimSet`, `roofMetal`, and `roofRidgeCap` for `Skylight.jsx`.

Thirty-nine property tests went with them, and they are **mapped rather than
dropped**: the kernel's `docs/trim-geometry.md` lists every property they
asserted against the `src/trim.rs` test that asserts it now. That audit found
two the kernel was *not* checking — the J-channel straddling the ridge, and
where the eave board lands term by term — and both were added to the kernel
before anything was deleted here. Neither suite would have caught them: both
were green before and after.
