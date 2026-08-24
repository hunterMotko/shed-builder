# Option and Placement Are Separate Concepts

A customer buys an **Option** (a priced catalog item) and positions it with a **Placement** (where it sits on the shed). These are two linked concepts, not one: an Option's price is catalog data, while its Placement is spatial data validated against the shed's current dimensions. Options divide into **Openings**, which cut a wall, and **Attachments**, which mount without cutting one.

## Considered Options

- **One concept.** A single "feature" record carrying both price and position. Rejected because Attachments (ramp, shutters, skylight, loft, workbench) have no wall coordinates, and the interior items have no geometry at all — half the fields would be meaningless for half the catalog.
- **Two unlinked concepts.** This is what the code did before this decision: `addOns.garageDoor.enabled` added $500 to the displayed price while `placements[]` decided what was actually rendered, with nothing connecting them. Two configurations could differ by $500 and be pixel-identical. That is a quote we could not honour.

## Consequences

- Selecting a placeable Option leaves it *unfinished* until it has a Placement, and the UI has to represent that state.
- Placement is constrained by the kind of Option: a door meets the floor, a ramp meets a door, a skylight rides the ridge.
- Placements store normalized position but absolute size, so a resize can leave an Opening that no longer fits. Resizing revalidates every Placement and surfaces a visible failure rather than silently relocating a customer's door.
