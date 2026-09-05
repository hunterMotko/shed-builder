import { describe, it, expect } from 'vitest';
import {
	OPTION_PARENTS,
	parentPlacements,
	isOptionAvailable,
	attachmentCount,
	carriesAttachment,
	attachmentValue,
} from './dependentOptions';

const window1 = { id: 'w1', type: 'window', wall: 'front' };
const window2 = { id: 'w2', type: 'window', wall: 'left' };
const garage = { id: 'g1', type: 'garage_door', wall: 'front' };

describe('isOptionAvailable', () => {
	it('leaves an Option with no parent alone', () => {
		expect(OPTION_PARENTS.skylight).toBeUndefined();
		expect(isOptionAvailable('skylight', { options: {}, placements: [] })).toBe(true);
	});

	it('offers shutters only where there is a window to hang them on', () => {
		// A pair of shutters flanks a window. On a shed with no windows it is
		// $70 of trim attached to nothing (issue #44).
		expect(isOptionAvailable('shutters', { options: {}, placements: [] })).toBe(false);
		expect(isOptionAvailable('shutters', { options: {}, placements: [window1] })).toBe(true);
	});

	it('offers a ramp only where there is a garage door', () => {
		// ramp_small is 7 ft wide and ramp_large 9 ft: a garage-door apron,
		// not a doorstep.
		expect(isOptionAvailable('ramp', { options: {}, placements: [window1] })).toBe(false);
		expect(isOptionAvailable('ramp', { options: {}, placements: [garage] })).toBe(true);
	});
});

describe('parentPlacements', () => {
	it('finds every Placement an attachment could hang on', () => {
		const found = parentPlacements('shutters', [window1, garage, window2]);
		expect(found.map((p) => p.id)).toEqual(['w1', 'w2']);
	});
});

describe('attachmentCount', () => {
	it('counts the parents actually carrying the attachment, not the ones that could', () => {
		// Two windows, one of them shuttered: one pair, not two. The count is
		// read off the Placements rather than kept beside them, because two
		// copies of a number drift.
		const placements = [{ ...window1, shutters: true }, window2];
		expect(attachmentCount('shutters', placements)).toBe(1);
	});

	it('counts nothing when no parent carries it', () => {
		expect(attachmentCount('ramp', [garage])).toBe(0);
		expect(attachmentCount('ramp', [{ ...garage, ramp: 'small' }])).toBe(1);
	});
});

describe('carriesAttachment', () => {
	const options = { shutters: { enabled: true }, ramp: { enabled: true, size: 'large' } };

	it('lets the Placement decide when it has said so', () => {
		expect(carriesAttachment('shutters', { ...window1, shutters: true }, {})).toBe(true);
		// And a Placement that says no outranks an Option that says yes: the
		// customer shuttered one window, not every window.
		expect(carriesAttachment('shutters', { ...window1, shutters: false }, options)).toBe(false);
	});

	it('falls back to the Option while nothing can create a Placement', () => {
		// The bridge for issue #10 — no UI path reaches `addPlacement`, so an
		// enabled Option has to stand in for a Placement that says yes.
		expect(carriesAttachment('shutters', window1, options)).toBe(true);
		expect(carriesAttachment('shutters', window1, {})).toBe(false);
	});

	it('carries the attachment’s own value, not just a flag', () => {
		expect(attachmentValue('ramp', { ...garage, ramp: 'small' }, options)).toBe('small');
		expect(attachmentValue('ramp', garage, options)).toBe('large');
	});
});
