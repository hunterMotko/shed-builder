# ADR-0015: The gable end is not a wall, and the octagon owns its own position

## Status

Accepted

## Revision log

| Date | Description |
|------|-------------|
| 2026-09-15 | Document created. Written after the change landed: issue #43 named this record, and it was not written at the time. |

## Context

ADR-0011 makes `openingTransform` the only place an Opening's coordinates are worked out, because
seven private copies of that formula were each wrong in some way (issues #17, #26). It describes a
Placement on one of the four walls in `WALL_SIDES`: a rectangle, where `normalizedX` runs across
the wall's own span.

The octagon window and the octagon vent do not sit on a wall. They sit in the gable end above the
eave — a triangle on a Gable, a gambrel face on a Barn — and neither was cut: `OctagonWindow`
described itself as rendered on top, so the siding was solid behind the glass. A Gable also
charged for one octagon and drew two (issue #43).

## Decision

**The end above the eave is not a wall.** It is not in `WALL_SIDES`, it takes no Placement, and
`openingTransform` does not describe it. `utils/gableEndOpenings.js` owns where an octagon sits and
which ends carry one, as the named exception to ADR-0011.

Two reasons make it an exception rather than a violation:

- **A triangle has no span for `normalizedX` to run across.** Its width is different at every
  height, so a normalized position on it would not mean one thing.
- **Nobody positions an octagon.** It is centred in the gable by definition, so there is no
  customer coordinate to store and no Placement to mint. It stays a per-end Option.

The ends are flat panels with no thickness, so the octagon is an **outline hole in the panel's
shape**, not a subtraction: CSG subtracts solids, and there is no solid here to subtract from.

## Consequences

- An octagon is bought per end. Ask `octagonForEnd`, never `options.octagonWindow.enabled`.
  `octagonEnds` in `pricingUtils.js` and `octagonEndCount` in `main.go` must agree, because the
  server's number is the Quote.
- A window and a vent bought for the same end cannot both be fitted — there is one hole — so the
  window wins, and both are still charged.
- The rule ADR-0011 guards still holds everywhere it applies: anything on one of the four walls
  goes through `openingTransform`. This record is not precedent for another component computing its
  own position.

## Related Decisions

- ADR-0011: the rule this is the exception to.
- ADR-0010: every Model renders four walls; what differs between Models is above the eave.
- ADR-0013: the roof is a slab, which is why a Barn's end is siding and not the roof prism's end cap.
