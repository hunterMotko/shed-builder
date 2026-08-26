import { describe, it, expect } from 'vitest';
import { overlayDesign } from './design';

// A Design as the store holds one, trimmed to the fields that matter here.
const storeDesign = () => ({
	width: 12,
	length: 16,
	trimColor: '#654321',
	roofMaterial: 'metal',
	placements: [],
});

describe('overlayDesign', () => {
	it('returns the store Design untouched when there is nothing to overlay', () => {
		const base = storeDesign();

		expect(overlayDesign(base, null)).toBe(base);
		expect(overlayDesign(base, undefined)).toBe(base);
	});

	it('takes the fields the override names', () => {
		const merged = overlayDesign(storeDesign(), { width: 12, length: 20, trimColor: '#FFFFFF' });

		expect(merged.length).toBe(20);
		expect(merged.trimColor).toBe('#FFFFFF');
	});

	it('leaves the fields the override does not name', () => {
		const merged = overlayDesign(storeDesign(), { length: 20 });

		// A fixture that says nothing about roofing still gets roofing.
		expect(merged.roofMaterial).toBe('metal');
		expect(merged.width).toBe(12);
	});

	// An override built by spreading a partial object can carry explicit
	// undefined values. Those must not punch holes in the Design — a missing
	// roofMaterial reaches the shader as `undefined` and renders nothing.
	it('does not let an undefined override win', () => {
		const merged = overlayDesign(storeDesign(), { roofMaterial: undefined, trimColor: '#FFFFFF' });

		expect(merged.roofMaterial).toBe('metal');
		expect(merged.trimColor).toBe('#FFFFFF');
	});

	it('does not modify the Design it was given', () => {
		const base = storeDesign();
		overlayDesign(base, { length: 20 });

		expect(base.length).toBe(16);
	});

	// A falsy value is a real value: black trim, a zero-depth porch.
	it('keeps a falsy override rather than falling back', () => {
		const merged = overlayDesign(storeDesign(), { trimColor: '', width: 0 });

		expect(merged.trimColor).toBe('');
		expect(merged.width).toBe(0);
	});
});
