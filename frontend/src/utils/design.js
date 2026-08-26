/**
 * Overlaying an explicit Design on the store's.
 *
 * The shed components normally read the Design a customer is configuring
 * straight out of the store. The Reference Match page needs the same
 * components rendering a *fixed* Design instead — the building in the
 * photograph — without touching what the customer has configured.
 */

/**
 * Take the fields `override` actually names and lay them over `base`.
 *
 * `undefined` never wins. A fixture that omits `roofMaterial` gets the store's
 * value rather than a hole, which is what lets a Design fixture name only the
 * handful of fields that make it the building in the photo.
 *
 * @param {Object} base - the full Design, every field present
 * @param {Object|null|undefined} override - a partial Design, or nothing
 * @returns {Object} a new Design; `base` is not modified
 */
export function overlayDesign(base, override) {
	if (!override) return base;

	const merged = { ...base };
	for (const key of Object.keys(override)) {
		if (override[key] !== undefined) merged[key] = override[key];
	}
	return merged;
}
