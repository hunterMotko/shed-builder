# ADR-0016: The app builds no Bill of Materials of its own

## Status

Accepted. Supersedes ADR-0009.

## Revision log

| Date | Description |
|------|-------------|
| 2026-09-15 | Document created |

## Context

ADR-0009 decided the Bill of Materials would be **templated** server-side from the price inputs —
Model, dimensions, Tier, Options — and never counted off the 3D scene. It had two reasons: a
cosmetic change to the render must not silently rewrite what gets bought, and modelling studs in a
renderer at a CSG performance ceiling (ADR-0005) was out of the question.

Both reasons were about this app's scene, and neither describes the app any more. There is no CSG:
wall panels, trim and roof pieces come from the geometry package the app depends on, and the
renderer only decides how they look. That package also answers the materials question — `shedBom`
takes the same Design and Placements the renderer draws and returns quantities measured off its own
geometry.

A template here would now be a second, weaker answer to a question the dependency already answers.
It could not know, for instance, that a Deluxe's deeper roof edge shortens a Barn's corner boards —
which the geometry, and therefore the dependency's bill, does.

## Decision

**This app builds no Bill of Materials of its own.** When it needs one, it asks its geometry package
for it, with the Design and Placements it is rendering.

It never keeps a template of quantities, and never counts members, meshes or anything else in its
own scene. What ADR-0009 set out to prevent — the picture deciding the order — stays prevented, from
the other side: the renderer changes the look and nothing else, and anything that could move a
quantity is not the renderer's to change.

**The Quote is never priced from a bill.** The server's catalog price is the Quote (ADR-0008). A bill
is what the shop buys; the Quote is what the customer is held to. Neither is derived from the other.

**Where the bill is computed** — in the browser, or somewhere the shop reads it — is not decided here.
It is decided when something first needs to show it (issue #13). Wherever that is, it uses **the same
version of the geometry package the renders are proven against**, so the bill and the picture are of
one building.

## Consequences

- ADR-0009 is superseded. It is kept as history, with its status marked.
- A fix to how the shed looks is made in materials, lighting, offsets or the camera — never by asking
  the geometry package for a different building.
- No materials logic lands in `main.go` or `pricingUtils.js`. A contributor reaching for "5 runners,
  studs at 16in" as constants here is re-introducing the template this record retires.

## Related Decisions

- **Supersedes ADR-0009** — the bill is not templated here.
- **ADR-0008** — the server's price is the Quote, which is why no bill can price one.
- **ADR-0005** — the CSG ceiling that was half of ADR-0009's reasoning no longer applies.
