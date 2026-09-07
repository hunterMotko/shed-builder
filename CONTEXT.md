# Shed Configurator

A customer designs a shed to their own specification, sees it rendered in 3D, and
requests a quote to buy it. Once a human confirms the order, the design tells us
what lumber to buy to build it.

## Language

### The product

**Model**:
A product line a customer chooses between — Barn or Gable. A Model determines the
roof profile, Wall Height, and trim set as one bundle, not as independent choices.
Wall Height is fixed by the Model's stud length; the roof sits on top of it, so the
Peak Height follows from the Model and the width rather than being chosen.
_Avoid_: style, type, variant

**Barn**:
The Model with a two-slope gambrel roof and 80.5in wall studs. The top is a **4 pitch**;
the sides are a **20 pitch**, measured off the reference photographs at 59.6° and 59.9°
on the two steep edges. (Quoted as a 12 pitch, but 12:12 is 45° and the built roof is
visibly steeper.)
_Avoid_: gambrel (that names the roof alone, not the product)

**Gable**:
The Model with a single-pitch triangular roof and 84in wall studs. Build spec: a **6
pitch**, quoted equivalently as **25%**. Sold at Deluxe grade only — the catalog's
Standard section prices barns.

**Pitch**:
A roof's slope as `X:12` — X inches of rise per 12 inches of run. The business also
quotes the traditional form, rise over *span*, where the same 6:12 roof is "25%" because
6 is a quarter of 24.
_Avoid_: angle, slope (say Pitch, and give it as X:12)

A Barn and a Gable come to within two inches of each other at every width the catalog
sells — the Barn's taller roof very nearly cancels its shorter studs. That is what lets
one nominal Peak Height sit on every SKU regardless of Model.

**Knuckle**:
Where a gambrel's steep lower slope meets its shallow upper one. Not a stored value — it
is placed so each slope carries half the roof's rise, which for the 20:12 / 4:12 spec puts
it five sixths of the way out from the ridge.

This is why the roof has one adjustment rather than three. Steepening the sides shortens
them *and* lengthens the top, because a steeper slope needs less run to carry its half of
the rise. Reach for the side pitch, not the Knuckle.

_A third roof form, a single-slope **skillion**, is built and photographed but is not
modelled, named in the app, or sold through it yet. Recorded here so nobody assumes two
Models is the whole product._

**Tier**:
The build grade — **Standard** or **Deluxe**. A grade, not a size: a Deluxe is framed with
2x6 rafters and 12in floor joists where a Standard uses 2x4 and 16in, and it carries a
roll-up garage door and a 36in entry door where a Standard carries double swing barn
doors. Both stand the same height, so **Tier is what selects a price** alongside width and
length — a `12x16` costs $6,089 as a Standard and $6,389 as a Deluxe. Widths above 12ft
are Deluxe only.
_Avoid_: Special (no such grade), and reading a height as a grade — the catalog's third
number is the same 11 on both

**Deluxe Barn**:
The Deluxe-grade Barn. `db` in the reference photo filenames. Not a taller building — a
Barn's wall is the same 85in at either grade — but a heavier one: 2x6 rafters, 12in floor
joists, a roll-up door and a 36in entry door.

**Wall Height**:
Floor to eave, set by the Model's stud length plus its plates, and the same on every size
that Model is sold in: **85in for a Barn** (80.5in studs) and **88.5in for a Gable** (84in
studs). An input to the geometry, not a customer choice — nothing in the catalog sells a
taller wall on the same Model. Lives in `utils/modelSpec.js`, not in the store.
_Avoid_: height (ambiguous — say Wall Height or Peak Height)

**Peak Height**:
Ground to ridge, including the Runners. An *outcome* — Wall Height plus the roof's rise —
so a wider shed of the same Model peaks higher: a 12ft Gable comes to 10.8ft and a 16ft
one to 11.8ft. Derived and display-only; nothing is built from it.

The third number in every catalog size is **a nominal 11**. It is a rounded label on the
SKU, not a measurement and not a grade — the real height is within about ten inches of it
either way. The 10ft sizes the price list used to carry were an older design and are no
longer built.
_Avoid_: wall height (a different measurement, and the one the app used to confuse this
with); treating the 11 as geometry

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
A pressure-treated 4x4 the shed sits on, running the full length. **Five, on every size
sold** — the count is on the 12ft, 14ft and 16ft build sheets alike, so it is a spec and
not a sample. The outboard pair is set in so its outside face clears the wall by 6in and
the other three spread evenly between them.
_Avoid_: skid, beam; reading five as a 12ft figure that scales with width

**Framing**:
What holds a shed up: Runners, floor joists, wall studs, rafters. The spec is on
`shed-options.md`, the same sheet the price catalog is cut from, and it is the same on
every size — **16in on centre 2x4 wall studs**, **24in on centre rafters**, five Runners,
a 3/4in PT plywood deck. Only two lines move with the **Tier**: floor joists tighten from
16in to 12in on centre, and rafters go from 2x4 to 2x6. A Deluxe is a heavier shed
underneath and overhead, not a tighter one in between.

The rafter is the one framing member you can see from outside. A 2x6 on edge is 2in
deeper than a 2x4, so a **Deluxe's roof edge reads 6in where a Standard's reads 4in**,
and the fascia, the rake, the J-channel and a Barn's corner boards all finish on it. The
grade changes what a shed looks like, not only what it is built from.
_Avoid_: taking the rafter spacing from the stud spacing — they are different numbers for
different reasons, and only one of them is 16

**Knuckle**:
The break point on a Barn roof where the steep lower slope meets the gentle upper
slope.

**Rake**:
The sloped edge of a roof at a gable or barn end. Straight on a Gable; on a Barn it breaks
at the Knuckle and runs as two segments per side. What sits along it differs by Model: a
Gable carries a boxed rake board, a Barn carries the **Fly** under the metal.

**Eave**:
The horizontal lower edge of a roof, along the long walls.

**Trim**:
The finish boards that cover the joints and edges of a build — corner boards,
fascia, rake boards. Trim is part of a Model, not an Option: a customer chooses
its colour, never its pieces.

**Trim Set**:
The trim a Model carries. Part of the Model bundle, alongside roof profile and Wall
Height. A Barn and a Gable do not carry the same set — that is a difference in the
product, not a difference in the renderer.

| | Corner Boards | Fascia | Rake | Eave overhang |
|---|---|---|---|---|
| Gable | yes | yes | yes, overhanging ~5in with a return at the eave | yes |
| Barn | yes | **no** | yes, following the gambrel | 2in, finishing in J-channel |

Trim stock is 4in (1x4), measured at 15-18px on a photograph scaling at 48.5 px/ft. An
earlier reading of these photos put it at 5.5in (1x6); the closer measurement agrees with
the 4in the renderer had always used. The face you see and the standoff off the siding are
two different numbers — see **Trim Stock**.

The eave overhang is a per-Model shop spec, not one number: a Gable gets a 6 5/8in soffit
and fascia box, except at 16 wide where it is 4 7/8in; a Barn gets 2in.

**Corner Board**:
A vertical trim board at a corner of the shed, covering the siding joint. Four
in a standard build.

**Fascia**:
A horizontal trim board along the eave, closing the roof edge above the wall. A Gable has
it; a Barn does not — its roof edge terminates against the wall with no board.
_Avoid_: eave board, trim board (say which board)

**Ridge Cap**:
The folded metal closure over the ridge of a Gable or the peak of a gambrel. Present on
every Reference Photo, and on both Models in the renderer. It is roofing, not trim: it is
drawn in the roof colour by the roof, never by the Trim Set.

**Trim Stock**:
A trim board has two numbers and they are not the same number. The **face** is what you
see, 4in. The **standoff** is how far the board stands off the siding, a dressed 1x. They
were one value once, which put every corner board inside the wall with its faces exactly
coplanar — nothing decided which surface won and each board rendered as hatched noise.
A corner board is nailed *on* the siding, and the two boards at a corner lap rather than
butt: one runs past to cover the other's end grain.

**Fly**:
The flat board along a Barn's rake, under the roof panel. Not a fascia and not a rake
board in the Gable sense — a flat 2x4, so 1.5in on the face. The panel runs past it and
laps it, which is why it reads as a band in the photographs rather than as an edge.

**J-Channel**:
The formed metal channel the roof panel's edge slides into, along the rake on both
Models. It is what holds the metal in at the front and back top edges. Roofing, not
trim: the same galvanized stock as the panel, and it reads dark in a photograph only
because it faces away from the sky.

**Knuckle Flashing**:
The bent metal cap over a Barn's Knuckle, closing the joint where the two gambrel slopes
meet. Two legs, one down each slope. Roofing, in the roof colour.
_Avoid_: gambrel break flashing (say Knuckle)

**Corner Box**:
The boxed soffit return where a Gable's rake overhang meets its eave, at each of the four
corners. Part of the Gable's Trim Set; a Barn has none, its rake finishing in J-channel
instead.

Trim colour is one colour. Where a photo appears to show two, the second is the window's
or door's own factory frame — a white vinyl window or a white steel entry door — sitting
inside a trim board that does match the Trim colour.

### Fidelity

**Reference Photo**:
A photograph of a real built shed. The fidelity target a render is judged against.
_Avoid_: reference image, ref
