import * as kernel from '../kernel';
/**
 * Coordinate system utilities for door/window placement
 * Converts between world coordinates and normalized wall coordinates
 *
 * Both functions are the kernel's now. They are the inverse of
 * `openingTransform`, and the kernel keeps the two beside each other so they
 * cannot drift — see the kernel repo's `docs/adr/0002`, whose follow-up this
 * closes.
 *
 * `getWallNormalizedCoordinates` still clamps to [0, 1] and is therefore a
 * projection rather than a true inverse: a click past the end of a wall comes
 * back on its edge. That is what makes every click on the shed yield a
 * placeable Placement.
 *
 * One behaviour changed: an unrecognised wall name used to come back as
 * (0, 0) — a real position, at the corner of the front wall — and now throws.
 */

/**
 * Determine which wall was hit based on intersection point
 * @param {THREE.Vector3} point - Intersection point in world coordinates
 * @param {number} width - Shed width (X axis)
 * @param {number} length - Shed length (Z axis)
 * @returns {'front' | 'back' | 'left' | 'right' | null} The wall name or null if no hit
 */
export function getWallFromIntersection(point, width, length) {
	// `wallHeight` is not read when deciding which wall a point is nearest, so
	// any value serves; the kernel takes the whole shed because the same call
	// also locates the point, which `wallHit` is the one to use for.
	const hit = kernel.wallHit(point, { width, length, wallHeight: 1 });
	return hit ? hit.wall : null;
}

/**
 * Convert world coordinates to normalized coordinates on a wall
 * Normalized coordinates range from 0.0 to 1.0 on both axes
 * @param {THREE.Vector3} point - Intersection point
 * @param {string} wall - Wall identifier ('front', 'back', 'left', 'right')
 * @param {number} width - Shed width
 * @param {number} length - Shed length
 * @param {number} wallHeight - Wall height
 * @returns {{normalizedX: number, normalizedY: number}} Normalized coordinates 0-1
 */
export function getWallNormalizedCoordinates(point, wall, width, length, wallHeight) {
	const n = kernel.normalizedOnWall(point, wall, { width, length, wallHeight });
	return { normalizedX: n.normalizedX, normalizedY: n.normalizedY };
}

/**
 * Get the wall dimensions in feet
 * @param {string} wall - Wall identifier
 * @param {number} width - Shed width
 * @param {number} length - Shed length
 * @returns {{wallWidth: number, wallLength: number}} Dimensions of the specified wall
 */
export function getWallDimensions(wall, width, length) {
	switch (wall) {
		case 'front':
		case 'back':
			return { wallWidth: width, wallLength: length };
		case 'left':
		case 'right':
			return { wallWidth: length, wallLength: width };
		default:
			return { wallWidth: 0, wallLength: 0 };
	}
}

/**
 * Which wall a ray hit, and where on it — both answers from one call.
 *
 * The one to reach for when a raycast has just returned a point. ADR-0002 is
 * explicit about why: `getWallFromIntersection` and `getWallNormalizedCoordinates`
 * take the same point and the same shed twice, with nothing keeping the two
 * calls agreeing about the wall. This asks once.
 *
 * Answers `null` when the point is not within the kernel's pick tolerance of
 * any wall plane, which is the caller's signal to ignore the click rather than
 * place something. It tests distance to a wall's *plane*, not whether the hit
 * is inside that wall's extent — so a caller that can be handed a hit on the
 * roof should check the height itself.
 *
 * @param {{x: number, y: number, z: number}} point world-space intersection
 * @returns {{wall: string, normalizedX: number, normalizedY: number} | null}
 */
export function wallHitAt(point, width, length, wallHeight) {
	return kernel.wallHit({ x: point.x, y: point.y, z: point.z }, { width, length, wallHeight })
		?? null;
}
