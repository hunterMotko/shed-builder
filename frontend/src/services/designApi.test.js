import { describe, it, expect } from 'vitest';
import { validateDesignConfig } from './designApi';

/**
 * The gate `useDesignPersistence.save()` runs before POSTing a Design.
 *
 * Sizes and Tiers below are read off `shed-options.md`, the catalog of
 * record, not off the price table the code consults.
 */

// 12x16 Standard is a real line in the catalog at $6089.
const validConfig = (overrides = {}) => ({
	width: 12,
	length: 16,
	tier: 'Standard',
	model: 'Gable',
	color: '#D2691E',
	roofColor: '#8B4513',
	trimColor: '#654321',
	placements: [],
	options: {},
	price: 6089,
	...overrides,
});

const opening = (overrides = {}) => ({
	id: 'p1',
	type: 'window',
	wall: 'front',
	normalizedX: 0.5,
	normalizedY: 0.5,
	width: 3,
	height: 3,
	...overrides,
});

describe('validateDesignConfig', () => {
	it('accepts a Design the store can actually hold', () => {
		expect(validateDesignConfig(validConfig())).toEqual({ isValid: true, errors: [] });
	});

	describe('the Design as a whole', () => {
		it('rejects a Model that is not a product line', () => {
			const { isValid, errors } = validateDesignConfig(validConfig({ model: 'Skillion' }));
			expect(isValid).toBe(false);
			expect(errors.join(' ')).toMatch(/Barn|Gable/);
		});

		it('rejects a colour that is not a hex triplet', () => {
			expect(validateDesignConfig(validConfig({ roofColor: 'chartreuse' })).isValid).toBe(false);
		});

		it('rejects a size the catalog does not sell', () => {
			// 14-wide appears only under "Deluxe barns & gables" — there is no
			// Standard 14x20 to sell, so a Quote for one cannot be honoured.
			expect(validateDesignConfig(validConfig({ width: 14, length: 20 })).isValid).toBe(false);
			// 12x26 is likewise Deluxe-only.
			expect(validateDesignConfig(validConfig({ width: 12, length: 26 })).isValid).toBe(false);
			// And 10x18 is not a length the catalog lists at any grade.
			expect(validateDesignConfig(validConfig({ width: 10, length: 18 })).isValid).toBe(false);
		});

		it('accepts those same sizes at the grade that does sell them', () => {
			expect(validateDesignConfig(
				validConfig({ width: 14, length: 20, tier: 'Deluxe' })
			).isValid).toBe(true);
			expect(validateDesignConfig(
				validConfig({ width: 12, length: 26, tier: 'Deluxe' })
			).isValid).toBe(true);
		});

		it('rejects a dimension that is missing or not a number', () => {
			expect(validateDesignConfig(validConfig({ width: undefined })).isValid).toBe(false);
			expect(validateDesignConfig(validConfig({ length: '16' })).isValid).toBe(false);
			expect(validateDesignConfig(validConfig({ tier: 'Premium' })).isValid).toBe(false);
		});
	});

	describe('Placements', () => {
		it('rejects a non-finite coordinate', () => {
			// JSON.stringify(NaN) is "null", so this saves clean and comes back
			// on load as an Opening whose cut box is at null — a wall that
			// silently fails to cut, or throws inside the evaluator.
			for (const bad of [NaN, Infinity, -Infinity, undefined, null, '0.5']) {
				expect(validateDesignConfig(
					validConfig({ placements: [opening({ normalizedX: bad })] })
				).isValid).toBe(false);
				expect(validateDesignConfig(
					validConfig({ placements: [opening({ normalizedY: bad })] })
				).isValid).toBe(false);
			}
		});

		it('rejects a coordinate off its own wall', () => {
			// Normalized position runs 0 to 1 across the wall.
			expect(validateDesignConfig(
				validConfig({ placements: [opening({ normalizedX: 1.4 })] })
			).isValid).toBe(false);
			expect(validateDesignConfig(
				validConfig({ placements: [opening({ normalizedY: -0.2 })] })
			).isValid).toBe(false);
		});

		it('rejects an Opening with no size', () => {
			for (const bad of [0, -3, NaN, undefined]) {
				expect(validateDesignConfig(
					validConfig({ placements: [opening({ width: bad })] })
				).isValid).toBe(false);
				expect(validateDesignConfig(
					validConfig({ placements: [opening({ height: bad })] })
				).isValid).toBe(false);
			}
		});

		it('rejects a Placement on a wall the shed does not have', () => {
			expect(validateDesignConfig(
				validConfig({ placements: [opening({ wall: 'roof' })] })
			).isValid).toBe(false);
		});

		it('accepts an Opening at the very edges of its wall', () => {
			expect(validateDesignConfig(
				validConfig({ placements: [opening({ normalizedX: 0, normalizedY: 1 })] })
			).isValid).toBe(true);
		});

		it('names the Placement that is wrong, so the message is actionable', () => {
			const { errors } = validateDesignConfig(validConfig({
				placements: [opening({ id: 'a' }), opening({ id: 'b', normalizedX: NaN })],
			}));
			expect(errors).toHaveLength(1);
			expect(errors[0]).toMatch(/\bb\b|\b1\b/);
		});
	});

	it('reports every problem at once rather than only the first', () => {
		const { errors } = validateDesignConfig(validConfig({
			model: 'Skillion',
			color: 'not-a-colour',
			placements: [opening({ normalizedX: NaN })],
		}));
		expect(errors.length).toBeGreaterThanOrEqual(3);
	});
});
