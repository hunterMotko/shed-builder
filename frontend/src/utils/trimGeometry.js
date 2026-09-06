import * as kernel from '../kernel';

/**
 * Where the trim boards sit on a shed.
 *
 * The trim counterpart to `openingTransform` (ADR-0011): one place works out
 * the coordinates, so the components cannot drift apart.
 *
 * Everything is in shed space, the same space the walls are placed in: the
 * outer face of the front siding is at `+length / 2`, of the right siding at
 * `+width / 2`, and the floor is y = 0.
 *
 * **This file used to work those coordinates out.** It held `mitredBand` and
 * `bandUnderside` — real geometry, not wrappers — six pieces of trim stock as
 * constants, and a per-piece wrapper for each board and box on a shed, with
 * thirty-nine property tests behind them. The kernel has all of it, and once
 * the four trim and roof components started asking for a whole `trimSet` and
 * `roofMetal` instead of listing their own pieces, nothing here had a caller
 * left.
 *
 * What each of those tests asserted, and which kernel test asserts it now, is
 * written down in the kernel's `docs/trim-geometry.md` — including the two
 * properties the audit found the kernel was *not* checking, which were added
 * before anything was deleted. Both suites were green either way; only reading
 * the two lists against each other found them.
 */


/**
 * One Design, in the shape the kernel takes it.
 *
 * @param {string} model `'Barn'` or `'Gable'`
 * @param {Object} [extra] `pitches` for a Barn, `skylightFt` for a ridge
 *   skylight
 */
const designOf = (model, shedWidth, shedLength, wallHeight, extra = {}) => ({
	model,
	width: shedWidth,
	length: shedLength,
	wallHeight,
	...extra,
});

/**
 * Every piece of trim a Design carries: wood, in the trim colour.
 *
 * A Gable's set is eight corner boards cut level, a mitred rake on each end, an
 * eave fascia down each side and a boxed return at each corner. A Barn's is
 * eight corner boards cut to the gambrel's underside and the fly along each
 * rake — and no fascia at all, its roof edge finishing in metal.
 *
 * @returns {{boards: object[], parts: object[]}} `boards` are outlines to
 *   extrude (`<ExtrudedBand>`), `parts` are boxes (`<boxGeometry>`). Every
 *   piece has an `id` distinct across the whole shed, ready to be a key.
 */
export function trimSet(model, shedWidth, shedLength, wallHeight, extra = {}) {
	return kernel.trimSet(designOf(model, shedWidth, shedLength, wallHeight, extra));
}

/**
 * Every piece of metalwork on a Design's roof, in the roof colour.
 *
 * Both Models get a ridge cap and a J-channel down each rake; a Barn also gets
 * break flashing over each Knuckle. A skylight is part of this answer and not a
 * part laid over it — the cap breaks either side of the glass and the glass
 * fills exactly the run the metal gave up, so the two cannot drift (issue #42).
 *
 * @returns {{boards: object[], parts: object[], clampedFrom: number|undefined}}
 *   each part carries `kind`, `'glass'` or `'cap'`, for `ridgeMaterial`.
 *   `clampedFrom` is the skylight length asked for when the ridge was too short
 *   to give it — a fact about the request, not about a piece of metal.
 */
export function roofMetal(model, shedWidth, shedLength, wallHeight, extra = {}) {
	const metal = kernel.roofMetal(designOf(model, shedWidth, shedLength, wallHeight, extra));
	return { ...metal, parts: metal.parts.map(withKind) };
}

/** `'glass'` or `'cap'`, which the kernel says in the id. */
const withKind = (part) => ({
	...part,
	kind: part.id.startsWith('ridge-glass') ? 'glass' : 'cap',
});


/**
 * The metal ridge cap — two bent legs meeting over the peak.
 *
 * Both Models get one: a length of roof metal folded over the ridge, capping
 * the joint the two top slopes cannot lap themselves. It runs the slab's
 * whole depth and renders in the roof colour, from the roof component.
 *
 * @param peakY the profile's peak, wall-relative (the ridge rise)
 * @param slope rise/run of the slope EACH SIDE of the ridge — the main pitch
 *   on a Gable, the upper pitch on a Barn
 */
export function roofRidgeCap(peakY, slope, shedLength, wallHeight, { overhang, skylightFt = 0 } = {}) {
	const cap = kernel.roofRidgeCap(
		{ width: 0, length: shedLength, wallHeight }, peakY, slope, overhang, skylightFt);
	// The stock — a ~4 in leg down each side, 0.025 ft thick — is the kernel's,
	// and used to be restated here as defaults this function then ignored.
	//
	// Two shapes are put back the way this app's callers expect them. Upstream
	// carried the over-long-skylight report as a field on whichever glass piece
	// happened to be emitted; the kernel returns it beside the pieces. And
	// callers switch on `kind`, which the kernel puts in the id.
	return cap.pieces.map((p) => {
		const piece = withKind(p);
		return piece.kind === 'glass' && cap.clampedFrom !== undefined
			? { ...piece, clampedFrom: cap.clampedFrom }
			: piece;
	});
}
