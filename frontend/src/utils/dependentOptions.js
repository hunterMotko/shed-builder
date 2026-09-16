/**
 * Options that hang on another Opening.
 *
 * A pair of shutters flanks a window; a ramp meets a garage door. Neither is a
 * thing you can buy for a shed that has nowhere to put it — `shutters_per_pair`
 * on a windowless shed is $70 of trim attached to nothing, and `ramp_small` is
 * 7 ft wide and `ramp_large` 9 ft, which is a garage-door apron rather than a
 * doorstep (issue #44).
 *
 * So an attachment is a **field on the parent Placement** — `shutters: true`,
 * `ramp: 'small'` — and not an Option of its own. It has no position to carry
 * that the parent does not already give it, and no existence apart from it:
 * remove the window and its shutters go with it, because they were never
 * anywhere else.
 *
 * **There is no Option flag to fall back to any more** (issue #10). There used
 * to be, while nothing in the UI could create a Placement; an enabled Option
 * stood in for one so shutters were not unbuyable. Placements are the only
 * answer now, which is what makes the count the price.
 */

/** Which Placement type each attachment hangs on. */
export const OPTION_PARENTS = {
	shutters: 'window',
	ramp: 'garage_door',
};

/**
 * Every Placement an attachment could hang on.
 *
 * @param {string} optionKey
 * @param {Array} placements
 * @returns {Array} empty for a key that hangs on nothing
 */
export function parentPlacements(optionKey, placements = []) {
	const parentType = OPTION_PARENTS[optionKey];
	if (!parentType) return [];
	return placements.filter((p) => p.type === parentType);
}

/**
 * How many parents are carrying the attachment — pairs of shutters, ramps.
 * This is what it is priced on, because the Placements are where the truth is.
 *
 * @param {string} optionKey
 * @param {Array} placements
 * @returns {number}
 */
export function attachmentCount(optionKey, placements = []) {
	return parentPlacements(optionKey, placements).filter((p) => Boolean(p[optionKey])).length;
}

/**
 * Whether one parent Placement carries the attachment.
 *
 * @param {string} optionKey
 * @param {Object} placement
 * @returns {boolean}
 */
export function carriesAttachment(optionKey, placement) {
	return Boolean(placement?.[optionKey]);
}

/**
 * The attachment's value on one parent — a ramp's size, say, rather than a bare
 * yes.
 *
 * @returns {*} `undefined` when the parent does not carry it at all
 */
export function attachmentValue(optionKey, placement) {
	const own = placement?.[optionKey];
	if (!own) return undefined;
	return own === true ? true : own;
}
