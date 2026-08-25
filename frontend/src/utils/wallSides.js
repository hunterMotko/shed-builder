/**
 * The four walls of a shed, and the routing of Placements onto them.
 *
 * Every Model renders all four. A customer can put a door on any side of any
 * shed, so the wall a Placement names is always a wall that exists — see
 * ADR-0010. What differs between Models is what sits *above* the eave: a Gable
 * has `GableEnd` triangles, a Barn has the gambrel end-caps.
 */

/** Wall ids, matching the `wall` field of a Placement. */
export const WALL_SIDES = ['front', 'back', 'left', 'right'];

/**
 * Group Placements by the wall that will render them.
 *
 * @param {Array} placements - every Placement on the Design
 * @param {string[]} sides - the walls being rendered (defaults to all four)
 * @returns {{byWall: Object, dropped: Array}} `byWall` has one entry per
 *   rendered side, always present even when empty. `dropped` holds any
 *   Placement naming a wall that is not being rendered — it must be empty for
 *   a Model rendering `WALL_SIDES`, and a non-empty `dropped` means openings
 *   are being lost.
 */
export function routePlacements(placements = [], sides = WALL_SIDES) {
	// Null prototype so a Placement naming 'constructor' or 'toString' cannot
	// collide with an inherited property and be routed to a wall that is not
	// being rendered.
	const byWall = Object.create(null);
	for (const side of sides) byWall[side] = [];

	const dropped = [];
	for (const placement of placements) {
		if (sides.includes(placement.wall)) byWall[placement.wall].push(placement);
		else dropped.push(placement);
	}

	return { byWall, dropped };
}
