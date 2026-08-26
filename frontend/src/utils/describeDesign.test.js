import { describe, it, expect } from 'vitest';
import { describeDesign } from './describeDesign';

// The 3D canvas is the entire output of the product and conveys nothing to a
// screen reader. This sentence is the only non-visual route to the Design, so
// it has to carry what the render carries (issue #21).
const design = (overrides = {}) => ({
	model: 'Gable',
	width: 12,
	length: 16,
	tier: 'Standard',
	peakHeightFt: 10.84,
	sidingTexture: 'T1-11',
	roofMaterial: 'metal',
	options: {},
	...overrides,
});

describe('describeDesign', () => {
	it('leads with the size and the product line', () => {
		const text = describeDesign(design());
		expect(text).toMatch(/12 by 16 foot/i);
		expect(text).toMatch(/Gable/);
	});

	it('speaks the peak height rounded, not to five decimal places', () => {
		expect(describeDesign(design({ peakHeightFt: 10.8412 }))).toContain('10.8 feet');
	});

	it('names the Tier, since it is what selects the price', () => {
		expect(describeDesign(design({ tier: 'Deluxe' }))).toMatch(/Deluxe/);
	});

	it('says the materials in words a person uses, not catalog codes', () => {
		const text = describeDesign(design({ sidingTexture: 'T1-11', roofMaterial: 'metal' }));
		expect(text).toMatch(/ribbed/i);
		expect(text).toMatch(/metal/i);

		const other = describeDesign(design({ sidingTexture: 'smooth', roofMaterial: 'shingle' }));
		expect(other).toMatch(/smooth/i);
		expect(other).toMatch(/shingle/i);
	});

	it('says so plainly when no Options are chosen', () => {
		expect(describeDesign(design())).toMatch(/no options/i);
	});

	it('lists the Options that are enabled and omits the rest', () => {
		const text = describeDesign(design({
			options: {
				garageDoor: { enabled: true, size: '8x7' },
				entryDoor: { enabled: false, type: 'steel' },
				shutters: { enabled: true, pairs: 2 },
			},
		}));
		expect(text).toMatch(/garage door/i);
		expect(text).toMatch(/shutters/i);
		expect(text).not.toMatch(/entry door/i);
	});

	it('counts the Options that come in quantities', () => {
		const text = describeDesign(design({
			options: { vinylWindows: { enabled: true, count: 3 }, shutters: { enabled: true, pairs: 2 } },
		}));
		expect(text).toMatch(/3 vinyl/i);
		expect(text).toMatch(/2 pairs/i);
	});

	it('reads as one sentence, so a screen reader does not announce fragments', () => {
		const text = describeDesign(design({ options: { skylight: { enabled: true, runningFt: 8 } } }));
		expect(text.endsWith('.')).toBe(true);
		expect(text).not.toMatch(/\s{2,}|undefined|NaN|\[object/);
	});

	it('speaks a size as words rather than as a catalog code', () => {
		// "8x7" is not a word. Read aloud it comes out as "eight ex seven".
		const text = describeDesign(design({ options: { garageDoor: { enabled: true, size: '8x7' } } }));
		expect(text).toMatch(/8 by 7 foot/);
		expect(text).not.toMatch(/8x7/);
	});

	it('gets the article right in front of a number', () => {
		// "a 8 foot skylight" is not how anyone says it.
		const text = describeDesign(design({
			options: {
				skylight: { enabled: true, runningFt: 8 },
				garageDoor: { enabled: true, size: '8x7' },
			},
		}));
		expect(text).not.toMatch(/\ba 8\b/);
		expect(text).toMatch(/an 8 foot ridge skylight/);
	});

	it('carries the estimate, since the visual price bar says the same thing', () => {
		// Two live regions announcing overlapping facts means hearing the size
		// and Tier twice on every change, so the price joins this sentence and
		// the visual bar goes aria-hidden.
		expect(describeDesign(design({ priceUsd: 8614 }))).toMatch(/estimated at \$8,614/);
	});

	it('leaves the estimate out when there is not one', () => {
		expect(describeDesign(design())).not.toMatch(/estimated/);
	});

	it('survives a Design with no options object at all', () => {
		expect(() => describeDesign({ model: 'Barn', width: 10, length: 12, tier: 'Standard' })).not.toThrow();
	});
});
