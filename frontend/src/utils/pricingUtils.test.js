import { describe, it, expect } from 'vitest';
import {
	lookupBasePrice,
	getOptionLineItems,
	calculateTotalPrice,
	getAvailableTiers,
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
		expect(getAvailableTiers(12)).toEqual(['Standard', 'Deluxe']);
		expect(getAvailableTiers(16)).toEqual(['Deluxe']);
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
