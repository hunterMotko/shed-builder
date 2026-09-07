import { describe, it, expect, beforeEach } from 'vitest';
import { useShedStore } from './shedStore';
import { lookupBasePrice } from '../utils/pricingUtils';

// Names here use the CONTEXT.md vocabulary (Model, Option, Placement) while the
// calls still use the current identifiers. Issue #1 changes the calls; these
// names should survive it untouched.

const state = () => useShedStore.getState();

beforeEach(() => {
	state().reset();
});

describe('dimensions', () => {
	it('starts on a Design the catalog can sell', () => {
		const { width, length, tier } = state();
		expect(lookupBasePrice(width, length, tier)).not.toBeNull();
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

describe('Model', () => {
	it('fits a Barn with a roll-up door and a Gable with a sectional one', () => {
		state().setModel('Barn');
		expect(state().options.garageDoor.style).toBe('rollup');

		state().setModel('Gable');
		expect(state().options.garageDoor.style).toBe('sectional');
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
