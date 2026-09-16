import { describe, it, expect, beforeEach } from 'vitest';
import { useShedStore } from './shedStore';
import { lookupBasePrice, isSoldAsTier } from '../utils/pricingUtils';

// Names here use the CONTEXT.md vocabulary (Model, Option, Placement) while the
// calls still use the current identifiers. Issue #1 changes the calls; these
// names should survive it untouched.

const state = () => useShedStore.getState();

beforeEach(() => {
	state().reset();
});

describe('dimensions', () => {
	it('starts on a Design the catalog can sell', () => {
		const { width, length, tier, model } = state();
		expect(lookupBasePrice(width, length, tier)).not.toBeNull();
		// A price is not enough: the table has no Model in it, so it would
		// happily quote the opening Gable off a Barn's Standard line. It used
		// to — the app opened on a Standard Gable, a shed that is not sold.
		expect(isSoldAsTier(model, tier)).toBe(true);
	});

	it('never lands on a Design the catalog cannot sell', () => {
		// 13ft wide is not a width we sell at any Tier.
		state().setWidth(13);
		const { width, length, tier } = state();
		expect(lookupBasePrice(width, length, tier)).not.toBeNull();
	});

	it('carries the Tier up with a width sold only at Deluxe', () => {
		// 16ft wide is in the Deluxe list only, so a Standard cannot stay one.
		state().setWidth(16);
		const { width, length, tier } = state();
		expect(lookupBasePrice(width, length, tier)).not.toBeNull();
		expect(tier).toBe('Deluxe');
	});

	// Both grades are 11ft to the peak, so switching Tier is a change of build,
	// not of size — the size must survive it wherever the catalog sells both.
	it('keeps the size when the Tier changes, if that size is sold at both', () => {
		state().setWidth(12);
		state().setLength(16);
		state().setTier('Deluxe');

		expect(state().width).toBe(12);
		expect(state().length).toBe(16);
		expect(state().tier).toBe('Deluxe');
	});
});

describe('the grade a Model is sold at', () => {
	// A Gable is Deluxe only. Since the grade became geometry — a Deluxe's 2x6
	// rafters give it a 6in roof edge — a Standard Gable is not merely unpriced,
	// it is a shed that would be drawn wrong.
	it('moves a Standard Barn up a grade when it becomes a Gable', () => {
		state().setModel('Barn');
		state().setTier('Standard');
		expect(state().tier).toBe('Standard');

		state().setModel('Gable');
		expect(state().tier).toBe('Deluxe');
		// And keeps the size: every Standard size is sold as a Deluxe too.
		expect(state().width).toBe(12);
		expect(state().length).toBe(16);
	});

	it('will not be asked into a Standard Gable', () => {
		state().setModel('Gable');
		state().setTier('Standard');
		expect(state().tier).toBe('Deluxe');
	});

	it('leaves a Barn on the grade it was asked for', () => {
		state().setModel('Barn');
		state().setTier('Standard');
		expect(state().tier).toBe('Standard');
		expect(lookupBasePrice(state().width, state().length, state().tier)).toBe(6089);
	});
});

describe('Model', () => {
	it('keeps the Design sellable when the Model changes', () => {
		// A Gable is Deluxe only, so switching to one moves the grade.
		state().setTier('Standard');
		state().setModel('Gable');
		expect(state().tier).toBe('Deluxe');
	});

	it('keeps no door of its own', () => {
		// A garage door's style used to be an Option that `setModel` rewrote —
		// a copy of the Model kept somewhere else. A Barn carries a roll-up and
		// a Gable a sectional, so the assembly that draws one knows which, and
		// the store holds neither the door nor its style (issue #10).
		state().setModel('Barn');
		expect(state().options.garageDoor).toBeUndefined();
		expect(state().options.vinylWindows).toBeUndefined();
		expect(state().options.shutters).toBeUndefined();
	});
});

describe('Placements', () => {
	const placement = { id: 'p1', type: 'door', wall: 'front', normalizedX: 0.5, normalizedY: 0.34, width: 3, height: 6.8 };

	it('holds a Placement that was added, and drops it again', () => {
		state().addPlacement(placement);
		expect(state().placements).toHaveLength(1);

		state().removePlacement('p1');
		expect(state().placements).toHaveLength(0);
	});

	it('drops only the Placement named, and leaves the rest on the shed', () => {
		// The list's Remove button is per row. Filtering by anything less exact
		// than the id — the wall, the type — would take a neighbour off with it.
		state().addPlacement(placement);
		state().addPlacement({ ...placement, id: 'p2' });
		state().addPlacement({ ...placement, id: 'p3', wall: 'back' });

		state().removePlacement('p2');
		expect(state().placements.map((p) => p.id)).toEqual(['p1', 'p3']);
	});

	it('clears every Placement at once', () => {
		// Behind the list's "Clear all", which is the only bulk way back off the
		// walls short of Reset — and Reset throws the whole Design away.
		state().addPlacement(placement);
		state().addPlacement({ ...placement, id: 'p2', wall: 'left' });

		state().clearPlacements();
		expect(state().placements).toEqual([]);
	});

	it('returns only the Placements on the wall asked for', () => {
		state().addPlacement(placement);
		state().addPlacement({ ...placement, id: 'p2', wall: 'back' });
		expect(state().getPlacements('front').map((p) => p.id)).toEqual(['p1']);
	});

	it('clears Placements when the Design is reset', () => {
		state().addPlacement(placement);
		state().reset();
		expect(state().placements).toEqual([]);
	});
});

describe('interior Options', () => {
	// Workbench, pegboard and loft were priced on both sides and reachable from
	// neither: the catalog priced them, `pricingUtils` had branches for them,
	// and the store had no keys, so nothing could switch one on (issue #9).
	it('offers the three the catalog prices', () => {
		const { options } = state();

		expect(options.workbench).toBeDefined();
		expect(options.pegboard).toBeDefined();
		expect(options.loft).toBeDefined();
		expect(options.workbench.enabled).toBe(false);
	});

	it('prices a loft by the footage added', () => {
		const before = state().getPrice();
		state().setOption('loft', { enabled: true, sqft: 96 });

		// $4 per sq ft. It is footage *added*: a Barn is built with a half loft
		// already, and this buys more on top of it.
		expect(state().getPrice()).toBe(before + 384);
	});

	it('prices a workbench by the running foot and pegboard by the sheet', () => {
		const before = state().getPrice();
		state().setOption('workbench', { enabled: true, runningFt: 10 });
		state().setOption('pegboard', { enabled: true, sheets: 3 });

		// $35 per running ft, $70 per 4x8 sheet.
		expect(state().getPrice()).toBe(before + 350 + 210);
	});

	it('puts them back on a reset', () => {
		state().setOption('loft', { enabled: true, sqft: 200 });
		state().reset();

		expect(state().options.loft.enabled).toBe(false);
		expect(state().options.loft.sqft).toBe(96);
	});
});

describe('the porch', () => {
	// It had geometry, store state and no price anywhere — not in the catalog,
	// not in `pricingUtils`, and not even a field in the server's Design, so a
	// porch was quoted at nothing and then discarded on save. A shed that can
	// be drawn but not quoted should not be drawable: it comes back with #45,
	// recessed, and priced.
	it('is not something a Design carries', () => {
		expect(state().porch).toBeUndefined();
		expect(state().setPorch).toBeUndefined();
		expect(state().getConfig()).not.toHaveProperty('porch');
	});
});
