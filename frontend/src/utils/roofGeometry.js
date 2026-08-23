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
 * @param {number} roofHeight - Total roof height from wall to peak in feet
 * @returns {object} { knuckleY, knuckleX } - Knuckle point coordinates
 */
export function calculateKnucklePoint(halfWidth, wallHeight, lowerPitch, roofHeight) {
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
	// Upper pitch: 10:12 = 0.83333
	const upperPitchRatio = upperPitch / 12;
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
