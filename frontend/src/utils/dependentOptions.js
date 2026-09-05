/**
 * Options that cannot stand on their own.
 *
 * A pair of shutters flanks a window; a ramp meets a garage door. Neither is a
 * thing you can buy for a shed that has nowhere to put it — `shutters_per_pair`
 * on a windowless shed is $70 of trim attached to nothing, and `ramp_small` is
 * 7 ft wide and `ramp_large` 9 ft, which is a garage-door apron rather than a
 * doorstep (issue #44).
 *
 * So an Option may declare a **parent**, and is unavailable until a Placement
 * of that parent exists. The attachment then lives as a **field on the parent
 * Placement** — `shutters: true`, `ramp: 'small'` — rather than as a Placement
 * of its own, because it has no position to carry that the parent does not
 * already give it. That is what makes the greyed-out checkbox and the
 * unbuildable geometry one condition, checked once.
 *
 * It also means the count is read off the Placements rather than kept beside
 * them: there is no `shutters.pairs`, because a second copy of a number drifts
 * from the first.
 */

/** Which Placement type each dependent Option hangs on. */
export const OPTION_PARENTS = {
	shutters: 'window',
	ramp: 'garage_door',
};

/**
 * Every Placement a dependent Option could hang on.
 *
 * @param {string} optionKey
 * @param {Array} placements
 * @returns {Array} empty for an Option with no parent
 */
export function parentPlacements(optionKey, placements = []) {
	const parentType = OPTION_PARENTS[optionKey];
	if (!parentType) return [];
	return placements.filter((p) => p.type === parentType);
}

/**
 * Whether an Option can be offered at all.
 *
 * An Option with no parent is always available. A dependent one needs somewhere
 * to go.
 *
 * **The `options` clause is a bridge, not the rule.** Enabling an Option does
 * not yet create a Placement — nothing in the UI can create one at all, and the
 * only runtime path into `addPlacement` is loading a saved Design (issue #10).
 * Until reconcile lands, an enabled parent Option counts as somewhere to go, or
 * shutters would be unbuyable in the Configurator. Delete this clause with
 * issue #10: once an Option mints its Placement, the Placement is the only
 * answer that matters.
 *
 * @param {string} optionKey
 * @param {{options?: Object, placements?: Array}} design
 * @returns {boolean}
 */
export function isOptionAvailable(optionKey, { options = {}, placements = [] } = {}) {
	const parentType = OPTION_PARENTS[optionKey];
	if (!parentType) return true;
	if (parentPlacements(optionKey, placements).length > 0) return true;

	// Bridge — see above.
	if (parentType === 'window') return Boolean(options.vinylWindows?.enabled);
	if (parentType === 'garage_door') {
		return Boolean(options.garageDoor?.enabled || options.additionalDoor?.enabled);
	}
	return false;
}

/**
 * How many parents are actually carrying the attachment.
 *
 * This is what the Option is priced on — pairs of shutters, ramps — because the
 * Placements are where the truth is.
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
 * The Placement's own field wins whenever it has one — a customer who
 * shuttered a single window has said something about every other window too.
 *
 * **The fallback is the same bridge as `isOptionAvailable`.** Nothing can put a
 * `shutters` field on a Placement yet, so an enabled Option stands in for one
 * (issue #10). Delete the fallback when reconcile lands.
 *
 * @param {string} optionKey
 * @param {Object} placement
 * @param {Object} options
 * @returns {boolean}
 */
export function carriesAttachment(optionKey, placement, options = {}) {
	const own = placement?.[optionKey];
	if (own !== undefined) return Boolean(own);
	return Boolean(options?.[optionKey]?.enabled);
}

/**
 * The attachment's value on one parent — a ramp's size, say, rather than a
 * bare yes. Falls back the same way `carriesAttachment` does.
 *
 * @returns {*} `undefined` when the parent does not carry it at all
 */
export function attachmentValue(optionKey, placement, options = {}) {
	if (!carriesAttachment(optionKey, placement, options)) return undefined;
	const own = placement?.[optionKey];
	if (own !== undefined && own !== true) return own;
	const cfg = options?.[optionKey] ?? {};
	return cfg.size ?? true;
}
