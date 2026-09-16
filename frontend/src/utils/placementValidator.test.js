import { describe, it, expect } from 'vitest';
import { placementIssues, validatePlacement, checkPlacementConflicts } from './placementValidator';

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
		// The wording is the kernel's now, and it names the axis rather than the
		// coordinate letter: "width is off the wall: 1.4", where this file used
		// to say "Invalid X coordinate: 1.4". Same verdict, same offending
		// value. What this asserts is that the message still says which way the
		// Opening ran off, because that is what the dialog shows a customer.
		expect(result.errors.join(' ')).toMatch(/width is off the wall/);
		expect(result.errors.join(' ')).toMatch(/1\.4/);
	});

	// This was marked `.fails` on the expectation that issue #10 would flip it
	// into an error. It did not, and the expectation was wrong: the kernel calls
	// this a **caution** deliberately, because the wall panel clips an Opening
	// that runs past its wall and a door crossing the floor becomes a notch
	// rather than a hole (ADR-0001, as amended). 144 golden vectors pin that
	// classification, so it does not move.
	//
	// What blocks a sale is a different question, and it is the app's: see
	// `placementIssues` below, and the save and quote gates that use it.
	it('cautions an Opening too wide to fit the wall it sits on', () => {
		// An 8ft door pushed to the far end of a 12ft wall overhangs the corner.
		const result = validatePlacement(door({ width: 8, normalizedX: 0.95 }), shed);

		expect(result.warnings.join(' ')).toMatch(/extends beyond the wall/);
		// The geometry is still buildable: the panel cuts it to the wall.
		expect(result.valid).toBe(true);
	});

	it('rejects a Placement missing the fields that identify it', () => {
		expect(validatePlacement({ ...door(), wall: undefined }, shed).valid).toBe(false);
	});
});

describe('A side wall is measured against its own span', () => {
	// Issue #17, in the validator rather than the transform. A left or right
	// wall stops half a foot short of the shed's length at each end, so a 3ft
	// door needs normalizedX <= 0.9 to fit its 15ft span — but <= 0.90625 if you
	// measure it against the shed's 16ft length, as this file used to. Anything
	// in between is a door hanging over the corner that nobody was told about.
	it('cautions a door that only fits if you measure the wrong wall', () => {
		const r = validatePlacement(door({ wall: 'left', normalizedX: 0.903 }), shed);
		expect(r.warnings.join(' ')).toMatch(/beyond the wall/);
	});

	it('still says nothing about one that genuinely fits', () => {
		expect(validatePlacement(door({ wall: 'left', normalizedX: 0.85 }), shed).warnings)
			.toEqual([]);
	});

	it('leaves front and back alone — their span is the shed width', () => {
		expect(validatePlacement(door({ wall: 'front', normalizedX: 0.85 }), shed).warnings)
			.toEqual([]);
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

// What the app does about an Opening the kernel is content to clip.
describe('Openings that no longer fit', () => {
	it('says nothing about a shed whose Openings all fit', () => {
		expect(placementIssues([door()], shed)).toEqual([]);
	});

	it('names the Opening that hangs off its wall', () => {
		const hanging = door({ id: 'p-9', width: 8, normalizedX: 0.95 });

		const issues = placementIssues([hanging], shed);

		expect(issues).toHaveLength(1);
		expect(issues[0].id).toBe('p-9');
		expect(issues[0].summary).toMatch(/extends beyond the wall/);
	});

	it('counts a caution, because a caution is what a resize leaves behind', () => {
		// The kernel calls this buildable — the panel clips it — and the app
		// still refuses to sell it. Both are right about different questions.
		const hanging = door({ width: 8, normalizedX: 0.95 });
		expect(validatePlacement(hanging, shed).valid).toBe(true);
		expect(placementIssues([hanging], shed)).toHaveLength(1);
	});

	it('answers for a shed with no Openings, and for no shed at all', () => {
		expect(placementIssues([], shed)).toEqual([]);
		expect(placementIssues([door()], undefined)).toEqual([]);
	});
});
