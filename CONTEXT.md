# Shed Configurator

A customer designs a shed to their own specification, sees it rendered in 3D, and
requests a quote to buy it. Once a human confirms the order, the design tells us
what lumber to buy to build it.

## Language

### The product

**Model**:
A product line a customer chooses between — Barn or Gable. A Model determines the
roof profile, wall height, stud length, and trim set as one bundle, not as
independent choices.
_Avoid_: style, type, variant

**Barn**:
The Model with a two-slope gambrel roof and 80.5in wall studs.
_Avoid_: gambrel (that names the roof alone, not the product)

**Gable**:
The Model with a single-pitch triangular roof and 84in wall studs.

**Tier**:
The build grade a wall height implies — Standard (10ft), Deluxe (11ft), Special (12ft).
Tier and Model together with width and length select a catalog price.

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
The sloped edge of a roof at a gable or barn end.

**Eave**:
The horizontal lower edge of a roof, along the long walls.

**Trim**:
The finish boards that cover the joints and edges of a build — corner boards,
fascia, rake boards. Trim is part of a Model, not an Option: a customer chooses
its colour, never its pieces.

**Trim Set**:
The trim a Model carries. Part of the Model bundle, alongside roof profile, wall
height and stud length. A Barn and a Gable do not carry the same set — that is a
difference in the product, not a difference in the renderer.
_The contents of each set are still being settled against the Reference Photos;
see issues #5, #6 and #22._

**Corner Board**:
A vertical trim board at a corner of the shed, covering the siding joint. Four
in a standard build.

**Fascia**:
A horizontal trim board along the eave, closing the roof edge above the wall.
_Avoid_: eave board, trim board (say which board)

### Fidelity

**Reference Photo**:
A photograph of a real built shed. The fidelity target a render is judged against.
_Avoid_: reference image, ref
