import * as kernel from '../kernel';

/**
 * Openings in a gable end.
 *
 * The end above the eave is not a wall: it is not in `WALL_SIDES`, it gets no
 * Placement, and `openingTransform` does not describe it. A triangle's
 * `normalizedX` spans a different width at every height, and nobody positions
 * an octagon anyway — it is centred in the gable by definition. So this is a
 * deliberate, named exception to ADR-0011 rather than an oversight (issue #43).
 *
 * What the exception still owes is a single source: both `GableEnd` and
 * `BarnEnd` used to work out the octagon's height themselves, with the same
 * 0.45 written twice. This module is where that lives now — the components
 * ask, neither computes.
 *
 * **These are outlines, not cuts.** Both ends are flat panels with no
 * thickness — `GableEnd` a bare three-vertex triangle, `BarnEnd` a
 * `ShapeGeometry` — and CSG subtracts solids, so on a zero-thickness surface
 * it is the wrong tool. A `THREE.Shape` takes holes natively and triangulates
 * them correctly, which is what the components do with what they get back.
 * The octagon used to be drawn on top of unbroken siding; `OctagonWindow`'s
 * own docstring said "no CSG cutout needed (rendered on top)", and from any
 * angle but dead on it read as a disc painted on a wall.
 *
 * Coordinates are the end's own plane, with `y = 0` at the eave — the origin
 * `GableEnd` and `BarnEnd` already build their outlines on.
 *
 * The geometry and the per-end reasoning are the kernel's. `octagonForEnd`
 * stays here because it reads two Options out of a Design, which is this app's
 * shape and not the kernel's — the kernel is asked about one Option at a time.
 *
 * One behaviour changed: an `ends` the kernel does not recognise now throws,
 * where this used to answer 'front' off the tail of a ternary. An octagon
 * fitted to an end nobody named is billed for and built.
 */

/** Circumradius of the octagon, in feet — `OctagonWindow`'s own default. */
export const OCTAGON_RADIUS = 0.75;

/** How far up the end the octagon sits, as a fraction of its peak. */
export const OCTAGON_HEIGHT_RATIO = 0.45;

/**
 * The octagon opening in a gable or gambrel end.
 *
 * @param {number} peakY - the end's height above the eave, at its peak
 * @param {{radius?: number, heightRatio?: number}} [opts]
 * @returns {{center: number[], outline: number[][]}} `outline` is the eight
 *   vertices in the end's own plane, already about `center`.
 */
export function octagonOpening(peakY, { radius = OCTAGON_RADIUS, heightRatio = OCTAGON_HEIGHT_RATIO } = {}) {
	return kernel.octagonOpening(peakY, radius, heightRatio);
}

/** The two ends of a shed that can carry an octagon. */
export const OCTAGON_ENDS = ['front', 'back'];

/**
 * Which ends an octagon Option is fitted to.
 *
 * An octagon is bought per end, so this is what both the price and the render
 * count. It used to be a bare `enabled` boolean, which `GableShed` passed to
 * both of its ends — two windows on the building and one on the invoice
 * (issue #43).
 *
 * An Option with no `ends` is one octagon on the front. That is the reading
 * that cannot overcharge, and it is what a customer ticking a box once means.
 *
 * @param {{enabled?: boolean, ends?: 'front'|'back'|'both'}} option
 * @returns {string[]} the ends to fit, in front-then-back order
 */
export function octagonEnds(option) {
	return kernel.octagonEnds(option ?? {});
}

/**
 * What goes in one end's octagon, or `null` for a bare end.
 *
 * A gable has one octagon-shaped hole in it, so a window and a vent bought for
 * the same end cannot both be fitted; the window wins, being the more visible
 * part. That is a rendering rule and not a pricing one — `getOptionLineItems`
 * still charges for both, because both were bought.
 *
 * @param {'front'|'back'} side
 * @param {Object} options - the Design's Options
 * @returns {'window'|'vent'|null}
 */
export function octagonForEnd(side, options) {
	if (octagonEnds(options?.octagonWindow).includes(side)) return 'window';
	if (octagonEnds(options?.octagonVent).includes(side)) return 'vent';
	return null;
}
