import { describe, it, expect } from 'vitest';
import {
	OPTION_PARENTS,
	parentPlacements,
	attachmentCount,
	carriesAttachment,
	attachmentValue,
} from './dependentOptions';

const window1 = { id: 'w1', type: 'window', wall: 'front' };
const window2 = { id: 'w2', type: 'window', wall: 'left' };
const garage = { id: 'g1', type: 'garage_door', wall: 'front' };

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
	it('asks the Placement, which is the only thing that can say', () => {
		expect(carriesAttachment('shutters', { ...window1, shutters: true })).toBe(true);
		expect(carriesAttachment('shutters', { ...window1, shutters: false })).toBe(false);
		// A window nobody has shuttered carries nothing. There is no Option
		// flag to fall back to any more (issue #10): one window can be
		// shuttered and the next left bare, and only the window can say which.
		expect(carriesAttachment('shutters', window1)).toBe(false);
	});

	it('carries the attachment’s own value, not just a flag', () => {
		expect(attachmentValue('ramp', { ...garage, ramp: 'small' })).toBe('small');
		expect(attachmentValue('ramp', { ...garage, ramp: 'large' })).toBe('large');
		expect(attachmentValue('ramp', garage)).toBeUndefined();
	});
});
