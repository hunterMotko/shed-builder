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
		const { width, length, wallHeight } = state();
		expect(lookupBasePrice(width, length, wallHeight)).not.toBeNull();
	});

	it('never lands on a Design the catalog cannot sell', () => {
		// 13ft wide is not a width we sell at any Tier.
		state().setWidth(13);
		const { width, length, wallHeight } = state();
		expect(lookupBasePrice(width, length, wallHeight)).not.toBeNull();
	});

	it('carries the wall height up with a width sold only at a higher Tier', () => {
		// 16ft wide exists at 11ft and 12ft walls, never at the 10ft Standard.
		state().setWidth(16);
		const { width, length, wallHeight } = state();
		expect(lookupBasePrice(width, length, wallHeight)).not.toBeNull();
		expect(wallHeight).toBeGreaterThan(10);
	});
});

describe('Model', () => {
	it('fits a Barn with a roll-up door and a Gable with a sectional one', () => {
		state().setStyle('Barn');
		expect(state().addOns.garageDoor.style).toBe('rollup');

		state().setStyle('Gable');
		expect(state().addOns.garageDoor.style).toBe('sectional');
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
