import { GAMBREL_LOWER_PITCH, GAMBREL_UPPER_PITCH } from './roofGeometry';
import * as kernel from '../kernel';

/**
 * Upstream names a gambrel's two slopes `lowerPitch` and `upperPitch`; the
 * kernel names them `lower` and `upper`. Kept here rather than in every caller,
 * and `undefined` where nothing was asked for, so the kernel applies its own
 * defaults instead of this file second-guessing them.
 */
function asKernelPitches({ lowerPitch, upperPitch } = {}) {
	if (lowerPitch === undefined && upperPitch === undefined) return undefined;
	return {
		lower: lowerPitch ?? GAMBREL_LOWER_PITCH,
		upper: upperPitch ?? GAMBREL_UPPER_PITCH,
	};
}

/**
 * What a Model bundles.
 *
 * A Model is a product line, not a set of independent choices: picking Barn or
 * Gable picks the roof profile, the wall height and the trim set together
 * (CONTEXT.md). The wall is a fixed stud length — the same on every size that
 * Model is sold in — and the roof sits on top of it, so the Peak Height is an
 * outcome of the Model and the width rather than something a customer picks.
 *
 * The app had this inverted: it read the catalog's third number as a wall
 * height and put a whole roof above it, rendering every shed 40-65% too tall
 * (issue #29).
 */

/** Bottom plate (1.5in) plus a double top plate (2 x 1.5in). */
const PLATE_INCHES = 4.5;

/** Floor deck thickness, in feet. */
export const FLOOR_THICKNESS = 0.125;

/** A 4x4 Runner, in feet. 3.5in actual, rounded up for legibility. */
export const RUNNER_SIZE = 0.333;

/**
 * How far the floor sits above the ground, in feet — the deck plus a Runner.
 *
 * The store also carries a `foundationHeight` of 1.5ft, left over from a
 * concrete-pad idea. `Runners` has never used it, so quoting a Peak Height off
 * it overstates the building by a foot.
 */
export const FOUNDATION_HEIGHT = FLOOR_THICKNESS + RUNNER_SIZE;

export const MODEL_SPEC = {
	Barn: {
		studInches: 80.5,
		roof: 'gambrel',
	},
	Gable: {
		studInches: 84,
		roof: 'gable',
	},
};

export const MODELS = Object.keys(MODEL_SPEC);

/**
 * Floor deck to eave, in feet.
 *
 * Studs plus plates. For a Barn that is 85in — which is exactly the wall height
 * the deleted reference-match fork had tuned by eye against a photograph, an
 * independent corroboration of the 80.5in stud figure.
 *
 * @param {'Barn'|'Gable'} model
 * @returns {number} wall height in feet
 */
export function wallHeightFt(model) {
	return kernel.modelSpec(model).wallHeightFt;
}

/**
 * How far the ridge stands above the eave, in feet.
 *
 * The rafters are cut to a fixed pitch, so this follows the span: a 6:12 Gable,
 * or a 20:12 / 4:12 gambrel whose Knuckle splits the rise evenly.
 *
 * @param {'Barn'|'Gable'} model
 * @param {number} width - span in feet
 * @param {{lowerPitch?: number, upperPitch?: number}} [pitches] - gambrel only
 * @returns {number} rise in feet
 */
export function roofRiseFt(model, width, pitches = {}) {
	return kernel.roofRiseFt(model, width, asKernelPitches(pitches));
}

/**
 * Ground to ridge, in feet — what the catalog calls the Peak Height.
 *
 * Includes what the shed stands on, because that is how the reference photos
 * measure and how the catalog quotes it. Display only: the catalog rounds every
 * size to a nominal 11ft, and this is the real number.
 *
 * @param {'Barn'|'Gable'} model
 * @param {number} width - span in feet
 * @param {number} foundationHeightFt - runners plus floor deck
 * @param {{lowerPitch?: number, upperPitch?: number}} [pitches] - gambrel only
 * @returns {number} peak height in feet
 */
export function peakHeightFt(model, width, foundationHeightFt, pitches = {}) {
	return kernel.peakHeightFt(model, width, foundationHeightFt, asKernelPitches(pitches));
}
