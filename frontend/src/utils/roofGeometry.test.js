import { describe, it, expect } from 'vitest';
import {
	pitchToRadians,
	calculateRise,
	calculateKnucklePoint,
	calculateSlopeLength,
	calculateGableRakeAngle,
	calculateGableRakeTrimLength,
	getRakeTrimAngles,
	createLowerRoofShape,
	createUpperRoofShape,
} from './roofGeometry';

// Expected values here come from trigonometry, not from the implementation:
// a 12:12 pitch is 45 degrees by definition, a 12-9 run/rise is a 3-4-5
// triangle scaled by three, and so on. If an expectation ever has to be
// derived by re-running the code's own formula, it is not a test.

describe('pitch', () => {
	it('reads a 12:12 pitch as 45 degrees', () => {
		expect(pitchToRadians(12)).toBeCloseTo(Math.PI / 4, 10);
	});

	it('reads a flat roof as no angle', () => {
		expect(pitchToRadians(0)).toBe(0);
	});

	it('rises half the run on a 6:12 pitch', () => {
		expect(calculateRise(24, 6)).toBe(12);
	});

	it('rises twice the run on a 24:12 pitch', () => {
		expect(calculateRise(12, 24)).toBe(24);
	});
});

describe('Barn knuckle', () => {
	// A 12ft-wide Barn at the store's default 24:12 lower pitch: the lower
	// slope covers 6ft of run, so it climbs 12ft above the wall top.
	it('sits a full run-and-rise above the wall top', () => {
		const { knuckleY, knuckleX } = calculateKnucklePoint(6, 10, 24, 18);
		expect(knuckleY).toBe(22);
		expect(knuckleX).toBe(6);
	});

	it('climbs with a steeper lower pitch', () => {
		const shallow = calculateKnucklePoint(6, 10, 6, 18).knuckleY;
		const steep = calculateKnucklePoint(6, 10, 24, 18).knuckleY;
		expect(steep).toBeGreaterThan(shallow);
	});

	it('leaves no gap between the lower and upper roof sections', () => {
		const knuckleY = 22;
		const lowerTop = Math.max(...createLowerRoofShape(6, 10, knuckleY).getPoints().map((p) => p.y));
		const upperBase = Math.min(...createUpperRoofShape(6, knuckleY, 26).getPoints().map((p) => p.y));
		expect(upperBase).toBeCloseTo(lowerTop, 10);
	});
});

describe('rake trim', () => {
	it('measures a slope by its hypotenuse', () => {
		// 12ft of run at 9:12 rises 9ft: a 3-4-5 triangle times three.
		expect(calculateSlopeLength(12, 9)).toBeCloseTo(15, 10);
	});

	it('rakes a Gable at 45 degrees when the roof is as tall as it is wide', () => {
		expect(calculateGableRakeAngle(6, 6)).toBeCloseTo(Math.PI / 4, 10);
	});

	it('sizes Gable rake trim to the hypotenuse', () => {
		expect(calculateGableRakeTrimLength(3, 4)).toBeCloseTo(5, 10);
	});

	it('keeps a Barn steeper below the knuckle than above it', () => {
		// The defining shape of a gambrel roof, and the thing a stale report
		// once claimed was inverted: lower 24:12 is steeper than upper 6:12.
		const { lowerRakeRotation, upperRakeRotation } = getRakeTrimAngles(24, 6);
		expect(lowerRakeRotation).toBeGreaterThan(upperRakeRotation);
	});
});
