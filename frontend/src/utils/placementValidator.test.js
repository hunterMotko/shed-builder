import { describe, it, expect } from 'vitest';
import { validatePlacement, checkPlacementConflicts } from './placementValidator';

const shed = { width: 12, length: 16, wallHeight: 10 };

const door = (overrides = {}) => ({
	id: 'p1',
	type: 'door',
	wall: 'front',
	normalizedX: 0.5,
	normalizedY: 0.34,
	width: 3,
	height: 6.8,
	...overrides,
});

describe('Placement validation', () => {
	it('accepts a door centred on a wall it fits', () => {
		expect(validatePlacement(door(), shed).valid).toBe(true);
	});

	it('rejects a Placement positioned off the end of its wall', () => {
		const result = validatePlacement(door({ normalizedX: 1.4 }), shed);
		expect(result.valid).toBe(false);
		expect(result.errors.join(' ')).toMatch(/X coordinate/);
	});

	// KNOWN GAP (issue #10): an Opening that hangs off the end of its wall is
	// reported as a warning, not an error, so `valid` stays true. The agreed
	// behaviour is a visible failure instead. Marked `.fails` deliberately —
	// when #10 lands this flips and the marker must come off.
	it.fails('rejects an Opening too wide to fit the wall it sits on', () => {
		// An 8ft door pushed to the far end of a 12ft wall overhangs the corner.
		expect(validatePlacement(door({ width: 8, normalizedX: 0.95 }), shed).valid).toBe(false);
	});

	it('rejects a Placement missing the fields that identify it', () => {
		expect(validatePlacement({ ...door(), wall: undefined }, shed).valid).toBe(false);
	});
});

describe('Placement conflicts', () => {
	it('reports two Openings sharing the same patch of wall', () => {
		const existing = [door({ id: 'a', normalizedX: 0.5 })];
		const result = checkPlacementConflicts(door({ id: 'b', normalizedX: 0.52 }), existing, shed);
		expect(result.overlaps).toBe(true);
	});

	it('allows the same position on a different wall', () => {
		const existing = [door({ id: 'a', wall: 'back' })];
		const result = checkPlacementConflicts(door({ id: 'b', wall: 'front' }), existing, shed);
		expect(result.overlaps).toBe(false);
	});
});
