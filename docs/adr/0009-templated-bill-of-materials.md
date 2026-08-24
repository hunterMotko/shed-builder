# The Bill of Materials Is Templated, Not Derived From Geometry

Once a human confirms an order, the materials list — runners, joists, studs, sheathing, roofing — is generated from the same inputs the price already uses (Model, dimensions, Tier, Options), not by counting members in the 3D scene.

The obvious alternative is to make the render construction-accurate and count off it, so that what the customer sees is literally what gets ordered. We rejected it for two reasons: it couples every visual change to a lumber order, so a cosmetic fix to stud spacing silently rewrites what you buy; and modelling studs at 16in on center turns each wall from one box into twenty, in a renderer already at a CSG performance ceiling (see ADR-0005).

`shed-options.md` already reads as a template — "5 4x4 PT runners", "16 in on center 2x4 pt floor joist" — which is the shape this takes.

## Consequences

- Framing detail in the 3D model serves realism alone; nothing on a purchase order depends on it.
- The BOM template and the price catalog share inputs and belong together, server-side.
- A future contributor will be tempted to "fix" this by counting studs off the mesh. Stopping that is why this record exists.
