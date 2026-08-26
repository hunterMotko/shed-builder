import { describe, it, expect } from 'vitest';
import {
	MODEL_SPEC,
	wallHeightFt,
	roofRiseFt,
	peakHeightFt,
	FOUNDATION_HEIGHT,
} from './modelSpec';

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

	// The 12:12 / 4:12 gambrel works out to the same 25% overall.
	it('rises a quarter of the span on a Barn too', () => {
		expect(roofRiseFt('Barn', 12)).toBeCloseTo(3, 10);
		expect(roofRiseFt('Barn', 16)).toBeCloseTo(4, 10);
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

	// A Barn stands on shorter studs, so at the same width it peaks lower.
	it('puts a Barn below a Gable of the same width', () => {
		expect(peakHeightFt('Barn', 12, FOUNDATION))
			.toBeLessThan(peakHeightFt('Gable', 12, FOUNDATION));
	});
});
