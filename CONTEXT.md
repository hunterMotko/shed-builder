# Shed Configurator

A customer designs a shed to their own specification, sees it rendered in 3D, and
requests a quote to buy it. Once a human confirms the order, the design tells us
what lumber to buy to build it.

## Language

### The product

**Model**:
A product line a customer chooses between — Barn or Gable. A Model determines the
roof profile, stud length, and trim set as one bundle, not as independent choices.
It also decides how much of the Peak Height the roof takes, and so how tall the
walls end up.
_Avoid_: style, type, variant

**Barn**:
The Model with a two-slope gambrel roof and 80.5in wall studs.
_Avoid_: gambrel (that names the roof alone, not the product)

**Gable**:
The Model with a single-pitch triangular roof and 84in wall studs. Sold at Deluxe grade
only — the catalog's Standard section prices barns.

_A third roof form, a single-slope **skillion**, is built and photographed but is not
modelled, named in the app, or sold through it yet. Recorded here so nobody assumes two
Models is the whole product._

**Tier**:
The build grade — **Standard** or **Deluxe**. A grade, not a size: a Deluxe is framed with
2x6 rafters and 12in floor joists where a Standard uses 2x4 and 16in, and it carries a
roll-up garage door and a 36in entry door where a Standard carries double swing barn
doors. Tier and Model with width and length select a catalog price.
_Avoid_: Special (no such grade — every 12ft build in the catalog is a Deluxe)

**Deluxe Barn**:
The Deluxe-grade Barn: the same gambrel roof on taller side walls, with standing headroom
along the eaves. `db` in the reference photo filenames.

**Peak Height**:
The third number in a catalog size — `10x16x11` is 10ft wide, 16ft long, **11ft to the
peak**. Wall height is what is left after the roof, so it differs by Model and by width: a
Barn's gambrel eats more of the total than a Gable's ridge.
_Avoid_: wall height (that is a different, derived measurement)

### What a customer builds

**Design**:
One complete shed specification: Model, dimensions, colors, and every Option with
its Placement. A Design is what gets saved, quoted, and eventually built.
_Avoid_: config, configuration, build

**Option**:
A priced catalog item a customer adds to a Design — a roll-up door, a vinyl
window, a ramp. Every Option has a price; an Option that must be positioned is
unfinished until it has a Placement.
_Avoid_: add-on, extra, upgrade, accessory

**Opening**:
An Option that cuts through a wall — doors and windows.

**Attachment**:
An Option that mounts to the shed without cutting a wall — ramp, shutters,
skylight, porch, loft, workbench.

**Placement**:
Where an Option sits on the shed. Constrained by the kind of Option: a door meets
the floor, a ramp meets a door, a skylight rides the ridge.

**Quote**:
The price a customer is offered for a Design. Produced by the server; the number
a customer is held to.
_Avoid_: estimate, total

**Bill of Materials**:
The lumber and materials needed to build one confirmed Design — runners, joists,
studs, sheathing, roofing.
_Avoid_: cut list (that is lengths to cut, a later and different thing)

### Construction

**Runner**:
A pressure-treated 4x4 the shed sits on. A standard build has five.
_Avoid_: skid, beam

**Knuckle**:
The break point on a Barn roof where the steep lower slope meets the gentle upper
slope.

**Rake**:
The sloped edge of a roof at a gable or barn end. Straight on a Gable; on a Barn it breaks
at the Knuckle and runs as two boards per side.

**Eave**:
The horizontal lower edge of a roof, along the long walls.

**Trim**:
The finish boards that cover the joints and edges of a build — corner boards,
fascia, rake boards. Trim is part of a Model, not an Option: a customer chooses
its colour, never its pieces.

**Trim Set**:
The trim a Model carries. Part of the Model bundle, alongside roof profile, peak height
and stud length. A Barn and a Gable do not carry the same set — that is a difference in
the product, not a difference in the renderer.

| | Corner Boards | Fascia | Rake |
|---|---|---|---|
| Gable | yes | yes | yes, along each gable end |
| Barn | yes | **no** | yes, following the gambrel |

Read off the Reference Photos; see issue #22.

**Corner Board**:
A vertical trim board at a corner of the shed, covering the siding joint. Four
in a standard build.

**Fascia**:
A horizontal trim board along the eave, closing the roof edge above the wall. A Gable has
it; a Barn does not — its roof edge terminates against the wall with no board.
_Avoid_: eave board, trim board (say which board)

### Fidelity

**Reference Photo**:
A photograph of a real built shed. The fidelity target a render is judged against.
_Avoid_: reference image, ref
