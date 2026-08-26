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

/** "8x7" is a catalog code, not a word — say it as a size. */
function spokenSize(size) {
	const match = /^(\d+)x(\d+)$/.exec(String(size ?? ''));
	return match ? `${match[1]} by ${match[2]} foot` : null;
}

const OPTION_PHRASES = {
	garageDoor: (o) => {
		const size = spokenSize(o.size);
		return size
			? `${article(size)} ${size} roll-up garage door`
			: 'a roll-up garage door';
	},
	additionalDoor: () => 'an additional garage door',
	entryDoor: (o) => `a ${o.type === 'nine_light' ? 'nine-light' : 'steel panel'} entry door`,
	vinylWindows: (o) => `${o.count ?? 1} vinyl slide window${(o.count ?? 1) === 1 ? '' : 's'}`,
	octagonWindow: () => 'an octagon gable window',
	skylight: (o) => `${article(o.runningFt ?? 0)} ${o.runningFt ?? 0} foot ridge skylight`,
	shutters: (o) => `${o.pairs ?? 1} pair${(o.pairs ?? 1) === 1 ? '' : 's'} of shutters`,
	ramp: (o) => `a ${o.size === 'large' ? 'large' : 'small'} treated ramp`,
	octagonVent: () => 'an octagon gable vent',
};

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
	} = design;

	const parts = [`${width} by ${length} foot ${model} shed`];

	if (tier) parts.push(`${tier} build`);
	// One decimal: this is read aloud, and "10.8412 feet" is not a sentence.
	if (Number.isFinite(peakHeightFt)) parts.push(`${peakHeightFt.toFixed(1)} feet to the peak`);
	if (SIDING[sidingTexture]) parts.push(SIDING[sidingTexture]);
	if (ROOFING[roofMaterial]) parts.push(ROOFING[roofMaterial]);

	const chosen = Object.entries(options)
		.filter(([key, config]) => config?.enabled && OPTION_PHRASES[key])
		.map(([key, config]) => OPTION_PHRASES[key](config));

	parts.push(chosen.length ? `with ${readableList(chosen)}` : 'with no options selected');

	// The visual price bar announced the size and Tier too, so a screen reader
	// heard both on every change. The estimate joins this sentence instead and
	// that bar is hidden from the accessibility tree.
	if (Number.isFinite(priceUsd)) parts.push(`estimated at $${priceUsd.toLocaleString('en-US')}`);

	return `${parts.join(', ')}.`;
}
