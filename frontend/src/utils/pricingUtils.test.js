import { describe, it, expect } from 'vitest';
import {
	lookupBasePrice,
	getOptionLineItems,
	calculateTotalPrice,
	getAvailableTiers,
	tiersForModel,
	isSoldAsTier,
	snapToValidCombo,
	PRICE_TABLE,
} from './pricingUtils';

// Expected prices come from shed-options.md, the catalog of record.

describe('base price', () => {
	it('quotes a 12x16 Standard from the catalog', () => {
		expect(lookupBasePrice(12, 16, 'Standard')).toBe(6089);
	});

	// The same size at the other grade is a different building and a different
	// price. Both are 11ft to the peak, so only the Tier tells them apart.
	it('quotes the same size at the other Tier for its own price', () => {
		expect(lookupBasePrice(12, 16, 'Deluxe')).toBe(6389);
	});

	it('refuses a combination the catalog does not sell', () => {
		expect(lookupBasePrice(13, 17, 'Standard')).toBeNull();
	});

	// Every catalog size is 11ft now, so a key built from the height would map
	// all seven Standard sizes onto their Deluxe twin and lose a price.
	it('keeps a price for every size the catalog lists', () => {
		// shed-options.md: 7 Standard sizes and 18 Deluxe.
		expect(Object.keys(PRICE_TABLE)).toHaveLength(25);
	});

	// Widths above 12 appear only in the Deluxe list.
	it('sells the wide sizes at Deluxe only', () => {
		expect(getAvailableTiers(12, 'Barn')).toEqual(['Standard', 'Deluxe']);
		expect(getAvailableTiers(16, 'Barn')).toEqual(['Deluxe']);
	});
});

// The price list has "Standard barn prices" and then "Deluxe barns & gables".
// There is no Standard gable in it and never was: Standard *is* the barn
// package — 2x4 rafters, 16in joists, double swing barn doors.
describe('a Gable is sold as a Deluxe only', () => {
	it('offers a Barn both grades and a Gable one', () => {
		expect(tiersForModel('Barn')).toEqual(['Standard', 'Deluxe']);
		expect(tiersForModel('Gable')).toEqual(['Deluxe']);

		expect(isSoldAsTier('Gable', 'Standard')).toBe(false);
		expect(isSoldAsTier('Barn', 'Standard')).toBe(true);
	});

	it('narrows by Model and by width, which are different rules', () => {
		// A Gable is Deluxe whatever its size; a 16 wide is Deluxe whatever its
		// Model. Neither implies the other, and a 12 wide Barn escapes both.
		expect(getAvailableTiers(12, 'Gable')).toEqual(['Deluxe']);
		expect(getAvailableTiers(16, 'Gable')).toEqual(['Deluxe']);
		expect(getAvailableTiers(12, 'Barn')).toEqual(['Standard', 'Deluxe']);
	});

	it('moves a Gable up a grade rather than onto a Barn price', () => {
		// 12x16xStandard is $6089 — a real entry, and the wrong one for a
		// Gable. Every Standard size is also sold as a Deluxe, so a Gable that
		// is moved up a grade keeps the size the customer picked.
		expect(snapToValidCombo(12, 16, 'Standard', 'Gable'))
			.toEqual({ width: 12, length: 16, tier: 'Deluxe' });
		expect(snapToValidCombo(12, 16, 'Standard', 'Barn'))
			.toEqual({ width: 12, length: 16, tier: 'Standard' });
	});

	it('leaves a size alone when only the grade was wrong', () => {
		// Each of the seven Standard sizes has a Deluxe twin, so switching a
		// Barn to a Gable never costs it its length.
		for (const key of Object.keys(PRICE_TABLE).filter((k) => k.endsWith('xStandard'))) {
			const [w, l] = key.split('x').map(Number);
			expect(snapToValidCombo(w, l, 'Standard', 'Gable'))
				.toEqual({ width: w, length: l, tier: 'Deluxe' });
		}
	});
});

describe('Option line items', () => {
	it('prices an 8x7 roll-up door at the 6x7 price plus two feet of width', () => {
		// shed-options.md: 6x7 roll-up is $450, "+$25 per foot wider".
		const [line] = getOptionLineItems({ garageDoor: { enabled: true, size: '8x7' } });
		expect(line.amount).toBe(450 + 2 * 25);
	});

	it('prices vinyl windows per window', () => {
		const [line] = getOptionLineItems({ vinylWindows: { enabled: true, count: 3 } });
		expect(line.amount).toBe(3 * 275);
	});

	it('charges an octagon per end it is fitted to', () => {
		// shed-options.md: octagon gable window, $85 — each. A Gable renders
		// one end at each gable, and used to light up both for a single charge
		// (issue #43), so two configurations differed by a window and by
		// nothing at all on the invoice.
		const [one] = getOptionLineItems({ octagonWindow: { enabled: true, ends: 'front' } });
		expect(one.amount).toBe(85);

		const [both] = getOptionLineItems({ octagonWindow: { enabled: true, ends: 'both' } });
		expect(both.amount).toBe(2 * 85);
	});

	it('charges an octagon vent per end, the same way', () => {
		// shed-options.md: vinyl octagon gable vent 16in, $85.
		const [both] = getOptionLineItems({ octagonVent: { enabled: true, ends: 'both' } });
		expect(both.amount).toBe(2 * 85);
	});

	it('leaves out Options that are not enabled', () => {
		expect(getOptionLineItems({ ramp: { enabled: false, size: 'large' } })).toEqual([]);
	});

	it('prices a workbench by the running foot', () => {
		// shed-options.md: 32in heavy duty workbench, $35 per running ft.
		const [line] = getOptionLineItems({ workbench: { enabled: true, runningFt: 8 } });
		expect(line.label).toContain('Workbench');
		expect(line.amount).toBe(280);
	});

	it('prices pegboard by the sheet', () => {
		// shed-options.md: pegboard 4x8 white, $70 per sheet.
		const [line] = getOptionLineItems({ pegboard: { enabled: true, sheets: 3 } });
		expect(line.label).toContain('Pegboard');
		expect(line.amount).toBe(210);
	});

	it('prices a loft by the square foot', () => {
		// shed-options.md: add loft/shelving, $4 per sq ft.
		const [line] = getOptionLineItems({ loft: { enabled: true, sqft: 96 } });
		expect(line.label).toContain('Loft');
		expect(line.amount).toBe(384);
	});

	it.todo('prices a Design with a porch — awaiting a porch price from shed-options.md');
});

describe('total', () => {
	it('adds enabled Options to the catalog base price', () => {
		const total = calculateTotalPrice(12, 16, 'Standard', { octagonWindow: { enabled: true } });
		expect(total).toBe(6089 + 85);
	});
});
