import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
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
	roofMaterialSlots,
	gableRoofRise,
	gambrelKnuckleRatio,
	GAMBREL_LOWER_PITCH,
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

describe('roofMaterialSlots', () => {
	// A gambrel lower slope: the same four-point profile GambrelRoof extrudes,
	// on a 12ft-wide shed with the knuckle 2.2ft above the eave.
	const extrudedGambrel = () =>
		new THREE.ExtrudeGeometry(createLowerRoofShape(6, 0, 2.2), {
			depth: 16,
			bevelEnabled: false,
		});

	// The bug this guards (issue #30): the component handed the mesh three
	// materials for a geometry that only ever addresses two group indices, so
	// the roof material sat at index 2 unused and the slopes drew in siding.
	it('gives one material per group the geometry actually addresses', () => {
		const indices = new Set(extrudedGambrel().groups.map((g) => g.materialIndex));

		expect(roofMaterialSlots('cap', 'slope')).toHaveLength(indices.size);
	});

	it('puts the slope material on the group the slopes are in', () => {
		const geometry = extrudedGambrel();
		const slots = roofMaterialSlots('cap', 'slope');

		// The caps are two triangles per end — far fewer vertices than the
		// slopes, which run the whole 16 ft length. The bigger group is the roof.
		const biggest = geometry.groups.reduce((a, b) => (b.count > a.count ? b : a));

		expect(slots[biggest.materialIndex]).toBe('slope');
	});
});

describe('gableRoofRise', () => {
	// Expectations are the definition of pitch, not the code's formula: a 6:12
	// roof rises 6 inches per 12 inches of run, so over a half-span of 6 ft it
	// rises 3 ft.
	it('rises half the run on a 6:12 roof', () => {
		expect(gableRoofRise(12)).toBeCloseTo(3, 10);
		expect(gableRoofRise(16)).toBeCloseTo(4, 10);
	});

	// The bug it replaces (issue #29): a flat 4ft rise meant the pitch drifted
	// with the width. Holding the pitch is the whole point.
	it('holds one pitch across every width the catalog sells', () => {
		for (const width of [10, 12, 14, 16]) {
			const angle = Math.atan2(gableRoofRise(width), width / 2);

			// atan(6/12) = 26.565 degrees, from trigonometry.
			expect((angle * 180) / Math.PI).toBeCloseTo(26.565, 3);
		}
	});

	it('is a quarter of the span, which is what a "25% pitch" means', () => {
		// Traditional pitch is rise over span, so a 6:12 slope is 1/4 pitch.
		expect(gableRoofRise(16) / 16).toBeCloseTo(0.25, 10);
	});
});

describe('gambrelKnuckleRatio', () => {
	// Expectations come from the geometry the rule states, worked out by hand,
	// not from re-running L / (L + U).
	it('splits the rise evenly between the two slopes', () => {
		const halfSpan = 6;
		for (const [lower, upper] of [[20, 4], [12, 4], [24, 6]]) {
			const r = gambrelKnuckleRatio(lower, upper);
			const upperRise = r * halfSpan * (upper / 12);
			const lowerRise = (1 - r) * halfSpan * (lower / 12);

			expect(upperRise).toBeCloseTo(lowerRise, 10);
		}
	});

	it('puts the Knuckle five sixths out for the 20:12 / 4:12 spec', () => {
		// 20 / (20 + 4) = 5/6
		expect(gambrelKnuckleRatio(20, 4)).toBeCloseTo(5 / 6, 10);
	});

	// The business asked for a longer top and a shorter, steeper side. Those are
	// one change, not three: a steeper side needs less run to carry its half of
	// the rise, so the Knuckle moves out and the top grows to meet it.
	it('lengthens the top and shortens the side as the side steepens', () => {
		const shallow = gambrelKnuckleRatio(12, 4);
		const steep = gambrelKnuckleRatio(20, 4);

		expect(steep).toBeGreaterThan(shallow);        // top run is longer
		expect(1 - steep).toBeLessThan(1 - shallow);   // side run is shorter
	});

	// The steep edges of reference/8-10-barn.jpg measure 59.6 and 59.9 degrees.
	// tan(59.7 deg) x 12 = 20.5, so 20:12 is the pitch those edges describe.
	it('matches the angle measured off the reference photograph', () => {
		const deg = (Math.atan(GAMBREL_LOWER_PITCH / 12) * 180) / Math.PI;

		expect(deg).toBeGreaterThan(58);
		expect(deg).toBeLessThan(61);
	});

	// A gambrel bends. If the Knuckle reached the eave or the ridge there would
	// be one slope, and the shape would be a gable.
	it('keeps the Knuckle strictly between the ridge and the eave', () => {
		for (const [lower, upper] of [[12, 4], [24, 6], [16, 5], [8, 4]]) {
			const r = gambrelKnuckleRatio(lower, upper);

			expect(r).toBeGreaterThan(0);
			expect(r).toBeLessThan(1);
		}
	});

	it('moves the Knuckle out as the lower slope steepens', () => {
		// A steeper side needs less run to gain its half of the rise, so the
		// Knuckle sits further from the ridge.
		expect(gambrelKnuckleRatio(24, 4)).toBeGreaterThan(gambrelKnuckleRatio(12, 4));
	});
});
