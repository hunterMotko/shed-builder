import * as kernel from '../kernel';

/**
 * Gambrel Roof Geometry Calculations
 * Implements professional gambrel barn roof with:
 * - Lower slope: 5:12 pitch (steeper)
 * - Upper slope: 10:12 pitch (gentler)
 * Calculates knuckle points, roof profiles, and pitch angles
 * for realistic barn-style shed rendering.
 */

import * as THREE from 'three';

// ============================================================
// SHARED UTILITIES (used by both Gable and Gambrel styles)
// ============================================================
/**
 * Convert pitch notation (X:12) to radians for rotation
 * @param {number} pitchX - Rise in inches per 12 inches run (e.g., 5 for 5:12)
 * @returns {number} Angle in radians
 */
export function pitchToRadians(pitchX) {
	// pitch X:12 = X/12 = slope ratio
	// angle = arctan(slope)
	return Math.atan(pitchX / 12);
}
/**
 * Calculate vertical rise given horizontal run and pitch
 * @param {number} horizontalRun - Horizontal distance in feet
 * @param {number} pitchX - Pitch (e.g., 5 for 5:12)
 * @returns {number} Vertical rise in feet
 */
export function calculateRise(horizontalRun, pitchX) {
	const pitchRatio = pitchX / 12;
	return horizontalRun * pitchRatio;
}

// ============================================================
// GAMBREL-SPECIFIC FUNCTIONS (5:12 lower, 10:12 upper roof)
// ============================================================
/**
 * Calculate the knuckle point of a gambrel roof
 * The knuckle is where the lower (steeper) slope meets the upper (gentler) slope
 * @param {number} halfWidth - Half width of shed in feet (wallWidth / 2)
 * @param {number} wallHeight - Height of walls in feet
 * @param {number} lowerPitch - Lower slope pitch (e.g., 5 for 5:12)
 * @returns {object} { knuckleY, knuckleX } - Knuckle point coordinates
 */
export function calculateKnucklePoint(halfWidth, wallHeight, lowerPitch) {
	// Lower pitch ratio (e.g., 5/12 = 0.41667)
	const lowerPitchRatio = lowerPitch / 12;
	// Knuckle Y: height at which lower slope meets upper slope
	// Rise = halfWidth * pitchRatio (from wall center to knuckle X position)
	const knuckleY = wallHeight + (halfWidth * lowerPitchRatio);
	// Knuckle X: horizontal distance from center at knuckle height
	// At knuckle, we've risen by: halfWidth * lowerPitchRatio
	// So we're still halfWidth away horizontally (hasn't changed)
	// But the slope changes here, so knuckle is at halfWidth, knuckleY
	const knuckleX = halfWidth;
	return {
		knuckleY,
		knuckleX,
	};
}

/**
 * Calculate roof profile vertices for gambrel style
 * Creates a hexagon profile for extruding into 3D roof
 * @param {number} halfWidth - Half width of shed
 * @param {number} wallHeight - Height of walls
 * @param {number} lowerPitch - Lower roof pitch (e.g., 5)
 * @param {number} upperPitch - Upper roof pitch (e.g., 10)
 * @param {number} roofHeight - Total roof height
 * @returns {array} Array of { x, y } vertices forming the roof profile
 */
export function calculateGambrelProfile(halfWidth, wallHeight, lowerPitch, upperPitch, roofHeight) {
	// Lower pitch: 5:12 = 0.41667
	const lowerPitchRatio = lowerPitch / 12;
	// Knuckle point (where lower meets upper)
	const knuckleY = wallHeight + (halfWidth * lowerPitchRatio);
	// Peak point (center top)
	const peakY = wallHeight + roofHeight;
	// For upper slope: from knuckle to peak
	// Remaining horizontal distance: 0 (peak is at center X=0)
	// Remaining vertical distance: peakY - knuckleY
	// Remaining horizontal: from knuckleX=halfWidth to 0 = -halfWidth
	// So upper slope covers: -halfWidth horizontal, (peakY - knuckleY) vertical
	// This gives us upper slope angle check: (peakY - knuckleY) / halfWidth should ≈ upperPitchRatio
	// Vertices (counterclockwise from bottom-left)
	const vertices = [
		// Bottom left
		{ x: -halfWidth, y: wallHeight },
		// Bottom right
		{ x: halfWidth, y: wallHeight },
		// Knuckle right (end of lower slope)
		{ x: halfWidth, y: knuckleY },
		// Peak center (top)
		{ x: 0, y: peakY },
		// Knuckle left (mirror of right)
		{ x: -halfWidth, y: knuckleY },
	];
	return vertices;
}

/**
 * Create THREE.Shape for lower roof section
 * The trapezoid from wall height to knuckle point
 * @param {number} halfWidth - Half width of shed
 * @param {number} wallHeight - Wall height
 * @param {number} knuckleY - Y coordinate of knuckle point
 * @returns {THREE.Shape} Shape representing lower roof
 */
export function createLowerRoofShape(halfWidth, wallHeight, knuckleY) {
	const shape = new THREE.Shape();
	// Start at bottom-left corner of wall
	shape.moveTo(-halfWidth, wallHeight);
	// Go to bottom-right
	shape.lineTo(halfWidth, wallHeight);
	// Go up right side to knuckle
	shape.lineTo(halfWidth, knuckleY);
	// Go across top to knuckle left
	shape.lineTo(-halfWidth, knuckleY);
	// Close path back to start
	shape.closePath();
	return shape;
}

/**
 * Create THREE.Shape for upper roof section
 * The triangle from knuckle point to peak
 * @param {number} halfWidth - Half width of shed
 * @param {number} knuckleY - Y coordinate of knuckle point
 * @param {number} peakY - Y coordinate of roof peak
 * @returns {THREE.Shape} Shape representing upper roof
 */
export function createUpperRoofShape(halfWidth, knuckleY, peakY) {
	const shape = new THREE.Shape();
	// Start at knuckle left
	shape.moveTo(-halfWidth, knuckleY);
	// Go to knuckle right
	shape.lineTo(halfWidth, knuckleY);
	// Go to peak center
	shape.lineTo(0, peakY);
	// Close path back to start
	shape.closePath();
	return shape;
}

/**
 * Get rake trim angles for angled roofline
 * Used to rotate trim pieces that follow the roof slope
 * @param {number} lowerPitch - Lower slope pitch (e.g., 5)
 * @param {number} upperPitch - Upper slope pitch (e.g., 10)
 * @returns {object} { lowerRakeRotation, upperRakeRotation } in radians
 */
export function getRakeTrimAngles(lowerPitch, upperPitch) {
	return {
		lowerRakeRotation: pitchToRadians(lowerPitch),
		upperRakeRotation: pitchToRadians(upperPitch),
	};
}

/**
 * Calculate the diagonal length of a roof slope for trim sizing
 * Used to size rake trim pieces that run along the slope
 * @param {number} horizontalRun - Horizontal distance of slope
 * @param {number} pitch - Pitch of slope (e.g., 5 for 5:12)
 * @returns {number} Diagonal length from base to top of slope
 */
export function calculateSlopeLength(horizontalRun, pitch) {
	const rise = calculateRise(horizontalRun, pitch);
	// Pythagorean theorem: diagonal = sqrt(run² + rise²)
	return Math.sqrt(horizontalRun * horizontalRun + rise * rise);
}

/**
 * Verify gambrel profile dimensions match expected pitches
 * Useful for debugging and validation
 * @param {object} profile - Profile vertices from calculateGambrelProfile
 * @param {number} halfWidth - Half width
 * @param {number} wallHeight - Wall height
 * @param {number} expectedLowerPitch - Expected lower pitch
 * @param {number} expectedUpperPitch - Expected upper pitch
 * @returns {object} { lowerPitchActual, upperPitchActual, lowerPitchError, upperPitchError }
 */
export function verifyGambrelProfile(profile, halfWidth, wallHeight, expectedLowerPitch, expectedUpperPitch) {
	// Find knuckle and peak from vertices
	const knuckle = profile.find(v => Math.abs(v.x - halfWidth) < 0.01 && v.y > wallHeight);
	const peak = profile.find(v => Math.abs(v.x) < 0.01 && v.y > wallHeight);
	// Calculate actual pitches from profile
	const lowerRise = knuckle.y - wallHeight;
	const lowerRun = halfWidth;
	const lowerPitchActual = (lowerRise / lowerRun) * 12; // Convert back to X:12 notation
	const upperRise = peak.y - knuckle.y;
	const upperRun = halfWidth; // From knuckle X (at halfWidth) to peak X (at 0)
	const upperPitchActual = (upperRise / upperRun) * 12;
	// Calculate errors
	const lowerPitchError = Math.abs(lowerPitchActual - expectedLowerPitch);
	const upperPitchError = Math.abs(upperPitchActual - expectedUpperPitch);
	return {
		lowerPitchActual: Math.round(lowerPitchActual * 100) / 100,
		upperPitchActual: Math.round(upperPitchActual * 100) / 100,
		lowerPitchError: Math.round(lowerPitchError * 100) / 100,
		upperPitchError: Math.round(upperPitchError * 100) / 100,
		isValid: lowerPitchError < 0.1 && upperPitchError < 0.1, // Within 0.1 pitch tolerance
	};
}

// ============================================================
// SHARED UTILITIES (Foundation & Validation)
// ============================================================
/**
 * Calculate foundation dimensions for the shed
 * Returns width and depth with slight overhang
 * @param {number} shedWidth - Shed width in feet
 * @param {number} shedLength - Shed length in feet
 * @param {number} overhang - Overhang on all sides in feet (default 0.5)
 * @returns {object} { width, depth, overhang }
 */
export function calculateFoundationDimensions(shedWidth, shedLength, overhang = 0.5) {
	return {
		width: shedWidth + overhang * 2,
		depth: shedLength + overhang * 2,
		overhang: overhang,
	};
}

// ============================================================
// GABLE-SPECIFIC FUNCTIONS (simple triangular roof)
// ============================================================
/**
 * Calculate the angle of Gable roof rake trim
 * The rake trim runs along the angled roof edge from the wall to the peak
 *
 * @param {number} halfWidth - Half width of shed in feet
 * @param {number} roofHeight - Total roof height in feet
 * @returns {number} Angle in radians for rotate on X-axis
 */
export function calculateGableRakeAngle(halfWidth, roofHeight) {
	// The rake forms a right triangle with base = halfWidth and height = roofHeight
	// Angle = arctan(rise / run) = arctan(roofHeight / halfWidth)
	return Math.atan(roofHeight / halfWidth);
}

/**
 * Calculate the length of Gable roof rake trim
 * Uses Pythagorean theorem to find the hypotenuse
 *
 * @param {number} halfWidth - Half width of shed in feet
 * @param {number} roofHeight - Total roof height in feet
 * @returns {number} Length of rake trim in feet
 */
export function calculateGableRakeTrimLength(halfWidth, roofHeight) {
	// Hypotenuse = sqrt(halfWidth^2 + roofHeight^2)
	return Math.sqrt(halfWidth * halfWidth + roofHeight * roofHeight);
}

// ============================================================
// STANDARD CONFIGURATIONS & CONSTANTS
// ============================================================
/**
 * Standard gambrel configuration (5:12 / 10:12)
 */
export const STANDARD_GAMBREL = {
	lowerPitch: 5,
	upperPitch: 10,
	roofHeight: 6, // Typical height that fits nicely with these pitches
};
/**
 * Standard foundation configuration
 */
export const STANDARD_FOUNDATION = {
	height: 1.5, // 1.5 feet tall
	color: '#8B7355', // Brown/tan
	overhang: 0.5, // 0.5 feet wider than walls
};

/**
 * The Barn's gambrel pitches, as X:12. The lower slope is the steep one — a
 * lower slope shallower than the upper is not a gambrel.
 *
 * The top is the stated 4 pitch. The sides were stated as a 12 pitch, but 12:12
 * is 45° and the built roof is visibly steeper: measuring the angle of both
 * steep edges on `reference/8-10-barn.jpg` gives 59.6° and 59.9°, or 20.5:12
 * and 20.7:12. 20 is what the photographs show, and it is what the business
 * meant by wanting the sides "shorter and steeper".
 *
 * Measuring the *angle* is what makes this trustworthy — unlike a rise, it does
 * not depend on knowing the scale, and two independent edges agreeing to within
 * half a degree is not a coincidence.
 */
export const GAMBREL_LOWER_PITCH = 20;
export const GAMBREL_UPPER_PITCH = 4;

/**
 * Where the Knuckle sits, as a fraction of the half-span measured out from the
 * ridge. 0 puts it at the ridge, 1 at the eave.
 *
 * Derived from the two pitches rather than set by hand: the Knuckle is placed
 * so each slope carries half the roof's rise, which is what makes a gambrel
 * read as a gambrel instead of a kinked gable. Solving
 * `r·U = (1 - r)·L` gives `r = L / (L + U)`.
 *
 * For the 20:12 / 4:12 spec that is 5/6, and the roof then rises 5/18 of its
 * span at every catalog width — a little more than the quarter the Gable's
 * 6:12 is quoted as. The two Models did carry the same overall proportion back
 * when the sides were quoted as a 12 pitch, which is where the retired "0.75,
 * and the same 25% as the Gable" came from; steepening them to the 20 the
 * photographs measure took the Barn above it.
 *
 * The hand-set 0.82 it replaces has no recorded source. It happens to be close
 * to what this rule gives for the old 24:12 / 6:12 pair (0.8), which suggests
 * the ratio was never the problem — the pitches were.
 *
 * @param {number} lowerPitch - steep slope, as X:12
 * @param {number} upperPitch - shallow slope, as X:12
 * @returns {number} fraction of the half-span from ridge to Knuckle
 */
export function gambrelKnuckleRatio(
	lowerPitch = GAMBREL_LOWER_PITCH,
	upperPitch = GAMBREL_UPPER_PITCH
) {
	return kernel.gambrelKnuckleRatio(lowerPitch, upperPitch);
}

/**
 * The Gable's roof pitch, as X:12.
 *
 * A build spec, not a customer choice — the rafters are cut to one angle and
 * the rise follows the span. Quoted by the business as "25% or a 6 pitch":
 * traditional pitch is rise over *span*, so a 6:12 slope is 6/24 = 1/4 of the
 * span, and the two names are the same roof.
 *
 * The renderer used a flat `ROOF_HEIGHT = 4`, which gave a 10ft-wide shed a
 * 9.6:12 roof and a 16ft-wide shed a 6:12 one — the pitch drifted with the
 * width instead of the rise following it (issue #29).
 */
export const GABLE_PITCH = 6;

/**
 * How far a Gable's ridge stands above its eave, in feet.
 *
 * @param {number} shedWidth - the span, in feet
 * @param {number} pitchX - pitch as X:12; defaults to the Gable's build spec
 * @returns {number} rise from the top of the wall to the ridge
 */
export function gableRoofRise(shedWidth, pitchX = GABLE_PITCH) {
	return kernel.gableRoofRise(shedWidth, pitchX);
}

/**
 * The material slots an extruded roof addresses, in order.
 *
 * `ExtrudeGeometry` emits exactly two groups: one covering *both* end-caps and
 * one covering the extruded sides. It is not one group per cap. A three-entry
 * array — `[frontCap, backCap, slopes]` — parks the roof material at an index
 * nothing addresses and hands the slopes the cap material instead, which is why
 * every Barn roof drew in the siding colour (issue #30).
 *
 * @param {*} capMaterial - drawn on the end-caps (group 0)
 * @param {*} slopeMaterial - drawn on the roof slopes (group 1)
 * @returns {Array} the material array to hand the mesh
 */
export function roofMaterialSlots(capMaterial, slopeMaterial) {
	return [capMaterial, slopeMaterial];
}

// ── The roof as a slab ───────────────────────────────────────────────────────
//
// The roof used to be a *filled* profile — a solid prism — extruded exactly the
// length of the shed. That shape has no thickness, no fascia face, no soffit,
// and no rake overhang, and a boxed rake cannot be hung on it.
//
// It also placed the eave datum at the tip of the overhang rather than at the
// wall, which quietly broke both Models: a Barn rendered its ridge 10 inches
// above the Peak Height quoted on screen, and a Gable spread its 6:12 rise over
// half a width *plus* the overhang, rendering an effective 5.54:12. Measuring
// from the wall fixes both, because that is where the rafter meets the plate
// and what `modelSpec.roofRiseFt` has always assumed.

/**
 * How thick the roof reads on a **Standard**, in feet.
 *
 * A 2x4 rafter on edge plus sheathing and panel. It is what gives the eave a
 * fascia face to show and the rake an edge to trim.
 *
 * Not the whole answer any more: a Deluxe is framed with 2x6 rafters and reads
 * 6in. Call `roofThicknessFt(tier)` unless you know the grade is Standard.
 */
export const ROOF_THICKNESS = 0.333;

/**
 * How thick the roof reads at one grade, in feet.
 *
 * The rafter is the one framing member visible from outside the shed: a 2x6 on
 * edge is 2in deeper than a 2x4, so a Deluxe's roof edge is 6in where a
 * Standard's is 4in, and the fascia, the rake, the J-channel and a Barn's
 * corner boards all finish on it.
 *
 * @param {string} tier - 'Standard' or 'Deluxe'
 */
export function roofThicknessFt(tier) {
	return kernel.roofThicknessFt(tier);
}

/**
 * How far the roof projects past the wall, in feet — at the eave and the rake.
 *
 * The shop builds a gable with a 6 5/8 in soffit and fascia box, except at 16
 * wide where it is 4 7/8 in. A barn has no box: the panel runs 2 in past and
 * finishes in J-channel.
 *
 * @param {string} model - 'Gable' or 'Barn'
 * @param {number} width - shed width in feet
 */
export function roofOverhangFt(model, width) {
	return kernel.roofOverhangFt(model, width);
}

/** How long the roof runs: the shed, plus the rake overhang at each end. */
export function roofSlabDepth(shedLength, overhang) {
	return kernel.roofSlabDepth(shedLength, overhang);
}

/**
 * Close a top surface into a slab by dropping a copy of it straight down.
 *
 * Vertical offset rather than perpendicular: it keeps the fascia cut plumb,
 * which is how the board is actually cut, and it keeps the seam at the Knuckle
 * a single point instead of two offset lines that have to be intersected.
 */
/**
 * The outline of a gable roof slab, in the plane it is extruded along.
 *
 * `y = 0` is the eave at the **wall**, so the ridge sits at the rise the Peak
 * Height quotes and the overhang tip hangs below the top plate — which is where
 * a rafter tail really is.
 *
 * @param {number} shedWidth - feet
 * @param {number} pitchX - rise in inches per 12 inches of run
 * @param {{overhang: number, thickness: number}} opts - both in feet
 * @returns {number[][]} closed outline, top surface first
 */
export function gableRoofProfile(shedWidth, pitchX, { overhang, thickness }) {
	return kernel.gableRoofProfile(shedWidth, pitchX, overhang, thickness);
}

/**
 * The gable slab's top surface alone, eave tip to eave tip over the ridge —
 * the line the rake fascia, the J-channel and the ridge cap all hang off.
 * Walked left to right, so consumers can treat consecutive points as runs.
 */
export function gableRoofTopLine(shedWidth, pitchX, { overhang }) {
	return kernel.gableRoofTopLine(shedWidth, pitchX, overhang);
}

/**
 * The outline of a gambrel roof slab, in the plane it is extruded along.
 *
 * The Knuckle comes from the two pitches (see `gambrelKnuckleRatio`) and is
 * measured across the wall, not across the wall plus the overhang — steepening
 * the sides shortens them and lengthens the top, and that only holds if both
 * slopes are measured from the same datum.
 *
 * @returns {number[][]} closed outline, top surface first
 */
export function gambrelRoofProfile(shedWidth, lowerPitch, upperPitch, { overhang, thickness }) {
	return kernel.gambrelRoofProfile(shedWidth, lowerPitch, upperPitch, overhang, thickness);
}

/**
 * The gambrel slab's top surface alone, eave tip to eave tip over both
 * Knuckles — what the Barn's rake band, J-channel and ridge cap follow.
 * Walked left to right, so consumers can treat consecutive points as runs.
 */
export function gambrelRoofTopLine(shedWidth, lowerPitch, upperPitch, { overhang }) {
	return kernel.gambrelRoofTopLine(shedWidth, lowerPitch, upperPitch, overhang);
}

/**
 * The filled gable-end face of a Barn, from the wall top to the ridge.
 *
 * A Barn's end wall above the eave used to be the roof prism's own end cap,
 * drawn with the siding shader. Once the roof is a slab there is no cap to
 * borrow, so the face is its own piece of siding — the gambrel counterpart of
 * `GableEnd`. It stops at the wall, with no overhang: the roof covers its top
 * edge.
 *
 * @returns {number[][]} outline, counter-clockwise from the left eave
 */
export function gambrelEndOutline(shedWidth, lowerPitch, upperPitch) {
	return kernel.gambrelEndOutline(shedWidth, lowerPitch, upperPitch);
}
