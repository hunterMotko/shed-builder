import * as kernel from '../kernel';

/**
 * Whether an Opening can be built where it has been put.
 *
 * The geometry is the kernel's (`src/validate.rs`), called through `../kernel`.
 * These wrappers keep the old shapes so `PlacementDialog` did not have to move.
 *
 * **Routing this changed an answer, deliberately.** The version here measured a
 * left or right wall against the shed's `length`; the kernel measures it against
 * the wall's own span, which is shorter by a wall thickness at each end. A door
 * near the corner of a side wall overhangs by up to six inches, and this file
 * used to say nothing about it. That is upstream issue #17 — the same mistake as
 * the one ADR-0011 consolidated out of `openingTransform`, living on in the
 * validator. Front and back walls are unaffected: their span *is* the shed width.
 *
 * The kernel divides what this file ran together. A **problem** stops the build;
 * a **caution** does not, because the panel handles it — an Opening past the end
 * of a wall is clipped to it, and one below the floor becomes a notch rather
 * than a hole (ADR-0001, as amended). That is the same problem/warning split
 * this file already had, named for what it means rather than how loud it is.
 */

/**
 * Validate a placement against wall boundaries
 * @param {Object} placement - Placement object to validate
 * @param {Object} shedDimensions - {width, length, wallHeight}
 * @returns {{valid: boolean, errors: string[], warnings: string[]}}
 */
export function validatePlacement(placement, shedDimensions) {
	const errors = [];

	// Identity stays here. A Placement crosses the boundary as five geometric
	// fields — wall, coordinates, size — so an Opening with no id or no type is
	// a record this app cannot store, not a shape the kernel can refuse.
	if (!placement.id || !placement.type || !placement.wall) {
		errors.push('Missing required placement fields');
	}

	let check;
	try {
		check = kernel.checkPlacement(placement, shedDimensions);
	} catch (err) {
		// The kernel refuses a Placement it cannot read at all: an unknown wall
		// name, or a missing coordinate. Upstream answered both with `valid:
		// false` and a message, and this dialog renders messages — it has
		// nowhere to put a throw. So the refusal is translated back into the
		// channel that already exists for it.
		errors.push(err.message ?? String(err));
		return { valid: false, errors, warnings: [] };
	}

	return {
		valid: errors.length === 0 && check.buildable,
		errors: [...errors, ...check.problems],
		warnings: check.cautions,
	};
}

/**
 * Check if two placements overlap
 * @param {Object} placement1 - First placement
 * @param {Object} placement2 - Second placement
 * @param {Object} shedDimensions - Shed dimensions
 * @returns {boolean} True if placements overlap
 */
export function checkOverlap(placement1, placement2, shedDimensions) {
	return kernel.placementConflicts(placement1, [placement2], shedDimensions).length > 0;
}

/**
 * Check for overlaps with all existing placements
 * @param {Object} newPlacement - Placement to check
 * @param {Array} existingPlacements - List of existing placements
 * @param {Object} shedDimensions - Shed dimensions
 * @returns {{overlaps: boolean, conflicts: Array}} Overlap info
 */
export function checkPlacementConflicts(newPlacement, existingPlacements, shedDimensions) {
	// The kernel answers with indices into the list it was given, because a
	// Placement carries no id across the boundary. The caller holds the list, so
	// naming what was hit is this side's job. Indices arrive as a Uint32Array,
	// in the order the list was in — the same order upstream's loop produced.
	const hits = kernel.placementConflicts(newPlacement, existingPlacements, shedDimensions);

	const conflicts = [...hits].map((i) => ({
		conflictId: existingPlacements[i].id,
		conflictType: existingPlacements[i].type,
		conflictWall: existingPlacements[i].wall,
	}));

	return {
		overlaps: conflicts.length > 0,
		conflicts,
	};
}
