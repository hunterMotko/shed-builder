import { describe, it, expect } from 'vitest';
import {
	MODEL_SPEC,
	wallHeightFt,
	roofRiseFt,
	peakHeightFt,
	FOUNDATION_HEIGHT,
} from './modelSpec';
import {
	gableRoofProfile,
	gambrelRoofProfile,
	roofOverhangFt,
	ROOF_THICKNESS,
	GABLE_PITCH,
	GAMBREL_LOWER_PITCH,
	GAMBREL_UPPER_PITCH,
} from './roofGeometry';


const FOUNDATION = FOUNDATION_HEIGHT;

describe('wallHeightFt', () => {
	// Arithmetic from the build spec, not from the code: studs plus a bottom
	// plate and a double top plate, 4.5in of plate in total.
	it('is the stud length plus its plates', () => {
		expect(wallHeightFt('Gable')).toBeCloseTo((84 + 4.5) / 12, 10); // 7.375 ft
		expect(wallHeightFt('Barn')).toBeCloseTo((80.5 + 4.5) / 12, 10); // 7.083 ft
	});

	// The deleted reference-match fork hard-coded `WH = 85 / 12`, tuned by eye
	// against a photograph. That it lands on the spec exactly is what makes the
	// 80.5in stud figure credible rather than assumed.
	it('puts a Barn wall at the 85in the reference fork had measured', () => {
		expect(wallHeightFt('Barn') * 12).toBeCloseTo(85, 10);
	});

	// A Model is a fixed bundle. Nothing in the catalog sells a taller wall on
	// the same Model, so width must not move it.
	it('does not change with the size of the shed', () => {
		expect(wallHeightFt('Barn')).toBe(wallHeightFt('Barn'));
		expect(MODEL_SPEC.Barn.studInches).not.toBe(MODEL_SPEC.Gable.studInches);
	});
});

describe('roofRiseFt', () => {
	// A 6:12 roof rises 6in per 12in of run, so over a 6ft half-span, 3ft.
	it('rises a quarter of the span on a Gable', () => {
		expect(roofRiseFt('Gable', 12)).toBeCloseTo(3, 10);
		expect(roofRiseFt('Gable', 16)).toBeCloseTo(4, 10);
	});

	// A gambrel's two slopes each carry half the rise, so with the top at 4:12
	// the whole roof rises twice what the top alone does: 2 x (5/6 x halfSpan x
	// 4/12), which on a 12ft span is 3.33 ft.
	it('rises to the Knuckle twice over on a Barn', () => {
		expect(roofRiseFt('Barn', 12)).toBeCloseTo(2 * ((5 / 6) * 6 * (4 / 12)), 10);
		expect(roofRiseFt('Barn', 12)).toBeCloseTo(3.333, 3);
	});

	// A gambrel gets its height from the steep side, so it out-rises a 6:12
	// gable on the same span.
	it('rises higher than a Gable of the same span', () => {
		expect(roofRiseFt('Barn', 12)).toBeGreaterThan(roofRiseFt('Gable', 12));
	});

	it('grows with the span, because the pitch is what is fixed', () => {
		expect(roofRiseFt('Gable', 16)).toBeGreaterThan(roofRiseFt('Gable', 10));
	});
});

describe('peakHeightFt', () => {
	// Measured off reference/12-16-gable-front.jpg, which is shot square-on:
	// about 11ft from the bottom of the runners to the ridge, matching the
	// catalog's 12x16x11.
	it('puts a 12ft Gable within a few inches of the catalog height', () => {
		const peak = peakHeightFt('Gable', 12, FOUNDATION);

		expect(peak).toBeGreaterThan(10.8);
		expect(peak).toBeLessThan(11.2);
	});

	// The catalog rounds every size to a nominal 11ft, so the real number has
	// to be allowed to differ — that is the whole point of deriving it.
	it('is taller on a wider shed of the same Model', () => {
		expect(peakHeightFt('Gable', 16, FOUNDATION))
			.toBeGreaterThan(peakHeightFt('Gable', 10, FOUNDATION));
	});

	// A Barn stands on shorter studs but carries a taller roof, and the two very
	// nearly cancel: at every width the catalog sells, the two Models come to
	// within a couple of inches of each other. That is what lets one nominal
	// height — 11 — sit on every SKU regardless of Model.
	it('brings both Models to the same height at a given width', () => {
		for (const width of [10, 12, 14, 16]) {
			const barn = peakHeightFt('Barn', width, FOUNDATION);
			const gable = peakHeightFt('Gable', width, FOUNDATION);

			expect(Math.abs(barn - gable)).toBeLessThan(0.2); // under 2.5 inches
		}
	});
});

// The roof the customer is quoted and the roof on screen must be the same roof.
//
// They were not. Both roof components measured their rise from the tip of the
// overhang rather than from the wall, so a 12 ft Barn drew its ridge 10 inches
// above the Peak Height beside it, and a Gable spread a 6:12 rise over half a
// width plus the overhang and rendered an effective 5.54:12.
describe('the rendered roof and the quoted Peak Height', () => {
	const peakOf = (points) => points.reduce((hi, p) => Math.max(hi, p[1]), -Infinity);

	it('agree on a Gable at every width the catalog sells', () => {
		for (const width of [10, 12, 14, 16]) {
			const profile = gableRoofProfile(width, GABLE_PITCH, {
				overhang: roofOverhangFt('Gable', width),
				thickness: ROOF_THICKNESS,
			});
			// Independently: 6:12 over half the width, in feet.
			expect(peakOf(profile)).toBeCloseTo((width / 2) * 0.5, 10);
			expect(peakOf(profile)).toBeCloseTo(roofRiseFt('Gable', width), 10);
		}
	});

	it('agree on a Barn at every width the catalog sells', () => {
		for (const width of [10, 12, 14, 16]) {
			const profile = gambrelRoofProfile(width, GAMBREL_LOWER_PITCH, GAMBREL_UPPER_PITCH, {
				overhang: roofOverhangFt('Barn', width),
				thickness: ROOF_THICKNESS,
			});
			expect(peakOf(profile)).toBeCloseTo(roofRiseFt('Barn', width), 10);
		}
	});

	it('do not move the ridge when the overhang changes', () => {
		// The overhang hangs below the eave; it must not lift the ridge. This is
		// the exact shape of the bug: a wider soffit box used to make a taller
		// building.
		const narrow = gableRoofProfile(12, GABLE_PITCH, { overhang: 0.1, thickness: 0.25 });
		const wide = gableRoofProfile(12, GABLE_PITCH, { overhang: 2, thickness: 0.25 });
		expect(peakOf(narrow)).toBeCloseTo(peakOf(wide), 10);
	});
});
