/**
 * The Design in a sentence.
 *
 * The 3D canvas is the whole output of this product and conveys nothing to a
 * screen reader — no role, no name, and no keyboard path into the scene. This
 * sentence is the only non-visual route to what has been configured, so it
 * carries what the render carries: size, Model, Tier, height, materials and
 * every Option that is switched on (issue #21).
 *
 * It is a pure function of the Design so it can be tested without mounting
 * React, and so the canvas label and the live region cannot disagree.
 */

const SIDING = {
	'T1-11': 'ribbed T1-11 siding',
	smooth: 'smooth board siding',
};

const ROOFING = {
	metal: 'a corrugated metal roof',
	shingle: 'an asphalt shingle roof',
};

/**
 * How to say each Option out loud, given its config.
 *
 * Quantities are spoken because they are priced per unit — "shutters" and
 * "four pairs of shutters" are different Quotes.
 */
/**
 * "a" or "an", by how the next word is *said*.
 *
 * These phrases are read aloud, and most of them start with a number: "a 8
 * foot skylight" is not how anyone says it. 8, 11 and 18 take "an" because
 * they begin with a vowel sound; 1 takes "a" because "one" does.
 */
function article(next) {
	const word = String(next).trim();
	if (/^(8|11|18)(\b|$)/.test(word)) return 'an';
	if (/^\d/.test(word)) return 'a';
	return /^[aeiou]/i.test(word) ? 'an' : 'a';
}

/** What has no position on the shed, and so is still an Option. */
const OPTION_PHRASES = {
	octagonWindow: () => 'an octagon gable window',
	skylight: (o) => `${article(o.runningFt ?? 0)} ${o.runningFt ?? 0} foot ridge skylight`,
	octagonVent: () => 'an octagon gable vent',
	workbench: (o) => `${article(o.runningFt ?? 0)} ${o.runningFt ?? 0} foot workbench`,
	pegboard: (o) => `${o.sheets ?? 0} sheet${(o.sheets ?? 0) === 1 ? '' : 's'} of pegboard`,
	loft: (o) => `${o.sqft ?? 0} square feet of loft`,
};

/**
 * What is *on* the shed, said aloud.
 *
 * Doors and windows are Placements rather than Options (issue #10), so this
 * reads the building rather than a set of checkboxes. Without it, a shed with
 * four windows and a roll-up door announced "with no options selected", which
 * is the one thing a person listening to this most needs it not to say.
 */
function placementPhrases(placements = []) {
	const of = (type) => placements.filter((p) => p?.type === type);
	const phrases = [];

	of('garage_door').forEach((p, i) => {
		if (i > 0) {
			phrases.push('an additional garage door');
			return;
		}
		// Said as a size, because "8x7" read aloud is "eight ex seven".
		const size = `${p.width} by ${p.height} foot`;
		phrases.push(`${article(size)} ${size} roll-up garage door`);
	});

	for (const p of of('door')) {
		phrases.push(`a ${p.doorType === 'nine_light' ? 'nine-light' : 'steel panel'} entry door`);
	}

	const swing = of('swing_barn_door').length;
	if (swing) phrases.push(`${swing} pair${swing === 1 ? '' : 's'} of swing barn doors`);

	const windows = of('window');
	if (windows.length) {
		phrases.push(`${windows.length} vinyl slide window${windows.length === 1 ? '' : 's'}`);
	}

	const shuttered = windows.filter((p) => p.shutters).length;
	if (shuttered) {
		phrases.push(`${shuttered} pair${shuttered === 1 ? '' : 's'} of shutters`);
	}

	for (const p of of('garage_door')) {
		if (p.ramp) phrases.push(`a ${p.ramp === 'large' ? 'large' : 'small'} treated ramp`);
	}

	return phrases;
}

/** Join a list the way a person reads it: "a, b and c". */
function readableList(items) {
	if (items.length <= 1) return items.join('');
	return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/**
 * @param {Object} design - model, width, length, tier, peakHeightFt,
 *   sidingTexture, roofMaterial, priceUsd, options
 * @returns {string} one sentence, ending in a full stop
 */
export function describeDesign(design = {}) {
	const {
		model, width, length, tier,
		peakHeightFt, sidingTexture, roofMaterial,
		priceUsd,
		options = {},
		placements = [],
	} = design;

	const parts = [`${width} by ${length} foot ${model} shed`];

	if (tier) parts.push(`${tier} build`);
	// One decimal: this is read aloud, and "10.8412 feet" is not a sentence.
	if (Number.isFinite(peakHeightFt)) parts.push(`${peakHeightFt.toFixed(1)} feet to the peak`);
	if (SIDING[sidingTexture]) parts.push(SIDING[sidingTexture]);
	if (ROOFING[roofMaterial]) parts.push(ROOFING[roofMaterial]);

	const chosen = [
		...placementPhrases(placements),
		...Object.entries(options)
			.filter(([key, config]) => config?.enabled && OPTION_PHRASES[key])
			.map(([key, config]) => OPTION_PHRASES[key](config)),
	];

	parts.push(chosen.length ? `with ${readableList(chosen)}` : 'with no options selected');

	// The visual price bar announced the size and Tier too, so a screen reader
	// heard both on every change. The estimate joins this sentence instead and
	// that bar is hidden from the accessibility tree.
	if (Number.isFinite(priceUsd)) parts.push(`estimated at $${priceUsd.toLocaleString('en-US')}`);

	return `${parts.join(', ')}.`;
}
