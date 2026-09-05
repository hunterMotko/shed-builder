import { describe, it, expect } from 'vitest';
import { octagonOpening, octagonEnds, octagonForEnd } from './gableEndOpenings';

/** Shoelace area of a closed outline given as points. */
const area = (pts) => {
	let a = 0;
	for (let i = 0; i < pts.length; i++) {
		const [x1, y1] = pts[i];
		const [x2, y2] = pts[(i + 1) % pts.length];
		a += x1 * y2 - x2 * y1;
	}
	return Math.abs(a) / 2;
};

const dist = ([ax, ay], [bx, by]) => Math.hypot(bx - ax, by - ay);

describe('octagonOpening', () => {
	// A 6:12 gable 12 ft wide peaks 3 ft over the eave.
	const PEAK = 3;
	const R = 0.75;
	const { outline, center } = octagonOpening(PEAK, { radius: R });

	it('is a regular octagon of the radius it was asked for', () => {
		expect(outline).toHaveLength(8);

		// Every vertex on the circumcircle, and every edge the same length.
		// A regular octagon of circumradius R has sides 2R sin(pi/8).
		for (const p of outline) expect(dist(p, center)).toBeCloseTo(R, 10);
		for (let i = 0; i < 8; i++) {
			const edge = dist(outline[i], outline[(i + 1) % 8]);
			expect(edge).toBeCloseTo(2 * R * Math.sin(Math.PI / 8), 10);
		}

		// And the area a regular octagon of that circumradius encloses, which
		// is 2 sqrt(2) R^2 — arrived at from the polygon, not from the code.
		expect(area(outline)).toBeCloseTo(2 * Math.SQRT2 * R * R, 10);
	});
});

describe('octagonEnds', () => {
	it('counts nothing when the Option is off', () => {
		expect(octagonEnds({ enabled: false, ends: 'both' })).toEqual([]);
		expect(octagonEnds(undefined)).toEqual([]);
	});

	it('reads a bare tick as one octagon, on the front', () => {
		// The reading that cannot overcharge. A Gable used to light up both
		// ends off a single `enabled` and bill for one (issue #43).
		expect(octagonEnds({ enabled: true })).toEqual(['front']);
	});

	it('gives both ends only when both were asked for', () => {
		expect(octagonEnds({ enabled: true, ends: 'back' })).toEqual(['back']);
		expect(octagonEnds({ enabled: true, ends: 'both' })).toEqual(['front', 'back']);
	});
});

describe('octagonForEnd', () => {
	it('gives each end the octagon bought for it', () => {
		const options = {
			octagonWindow: { enabled: true, ends: 'front' },
			octagonVent: { enabled: true, ends: 'back' },
		};
		expect(octagonForEnd('front', options)).toBe('window');
		expect(octagonForEnd('back', options)).toBe('vent');
	});

	it('leaves an end bare when nothing was bought for it', () => {
		expect(octagonForEnd('back', { octagonWindow: { enabled: true, ends: 'front' } })).toBeNull();
		expect(octagonForEnd('front', {})).toBeNull();
	});

	it('fits the window when both are bought for the same end', () => {
		// There is one hole in a gable and only one thing can be in it.
		const options = {
			octagonWindow: { enabled: true, ends: 'both' },
			octagonVent: { enabled: true, ends: 'both' },
		};
		expect(octagonForEnd('front', options)).toBe('window');
		expect(octagonForEnd('back', options)).toBe('window');
	});
});
