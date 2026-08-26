import { describe, it, expect } from 'vitest';
import catalog from '../../../backend/catalog.json';
import { PRICE_TABLE, OPTION_PRICES } from './pricingUtils';

/**
 * The catalog used to exist twice — here and in backend/main.go — and nothing
 * but diligence kept the two in step (issue #8). There is now one file, which
 * the frontend imports and the Go server embeds at compile time.
 *
 * Expected values below are read off `shed-options.md`, the catalog of
 * record, never off the table the code consults.
 */
describe('the shared catalog file', () => {
	it('carries every combination the catalog sells, and no more', () => {
		// 7 Standard lines plus 18 Deluxe lines in shed-options.md.
		expect(Object.keys(catalog.basePrices)).toHaveLength(25);
	});

	it('prices each grade the way shed-options.md does', () => {
		expect(catalog.basePrices['12x16xStandard']).toBe(6089);
		expect(catalog.basePrices['12x16xDeluxe']).toBe(6389);
		expect(catalog.basePrices['10x12xStandard']).toBe(4689);
		expect(catalog.basePrices['16x36xDeluxe']).toBe(13989);
	});

	it('sells the wide sizes as Deluxe only', () => {
		// 14 and 16 wide appear only under "Deluxe barns & gables".
		const standardWidths = Object.keys(catalog.basePrices)
			.filter((key) => key.endsWith('Standard'))
			.map((key) => Number(key.split('x')[0]));
		expect(Math.max(...standardWidths)).toBe(12);
	});

	it('prices the Options per item or per unit as listed', () => {
		expect(catalog.optionPrices.garage_door_6x7).toBe(450);
		expect(catalog.optionPrices.garage_door_8x7).toBe(500);
		expect(catalog.optionPrices.window_vinyl_slide).toBe(275);
		expect(catalog.optionPrices.skylight_per_ft).toBe(5);
		expect(catalog.optionPrices.loft_per_sqft).toBe(4);
	});

	it('is what pricingUtils serves, rather than a second copy of it', () => {
		// The point of the exercise: one set of numbers, not two that agree.
		expect(PRICE_TABLE).toEqual(catalog.basePrices);
		expect(OPTION_PRICES).toEqual(catalog.optionPrices);
	});

	it('holds numbers, so a typo cannot arrive as a string', () => {
		for (const [key, price] of Object.entries(catalog.basePrices)) {
			expect(typeof price, `basePrices.${key}`).toBe('number');
			expect(Number.isFinite(price), `basePrices.${key}`).toBe(true);
		}
		for (const [key, price] of Object.entries(catalog.optionPrices)) {
			expect(typeof price, `optionPrices.${key}`).toBe('number');
		}
	});
});
