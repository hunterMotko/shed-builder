import * as THREE from 'three';
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg';

/**
 * Cutting Openings out of a wall.
 *
 * Extracted from ShedWall so the cut can be tested without mounting React —
 * it is pure geometry in, geometry out. The cut happens in the wall's own
 * local space (ADR-0001), so a wall's local X always runs along its own width
 * no matter which side of the shed it is.
 *
 * `Evaluator.evaluate` requires `Brush` instances: it calls `prepareGeometry()`
 * on both operands, which `THREE.Mesh` does not have. Passing a Mesh throws,
 * which is exactly how every opening in this app silently failed to be cut.
 */

/** Wall thickness in feet (6 inches). */
export const WALL_THICKNESS = 0.5;

/**
 * How wide a wall actually is, in feet.
 *
 * Front and back span the full width of the shed. Left and right fit *between*
 * them, so they stop a wall thickness short at each end. A Placement's
 * `normalizedX` runs across this, not across the shed — measuring it against
 * the full `shedLength` is what put every left/right opening up to 6in away
 * from its own hole (issue #17).
 */
export function wallSpan(wall, shedWidth, shedLength) {
	return (wall === 'front' || wall === 'back')
		? shedWidth
		: shedLength - WALL_THICKNESS * 2;
}

/**
 * Where an Opening sits in shed space, and which way it faces.
 *
 * The single source of truth for opening placement: `cutOpenings` cuts the
 * hole in wall-local space and every visible component — door slab, window,
 * trim frame, shutters — positions itself in shed space. Both derive from this
 * one function so the two cannot drift apart.
 *
 * Y is measured from the floor: `normalizedY` 0 is the floor, 1 is the eave.
 * Components used to copy the wall-LOCAL formula (`-wallHeight/2 + ...`) into
 * shed space, which rendered every opening half a wall too low (issue #26).
 *
 * Rotation carries the component's local +Z — the face every one of them
 * builds toward — onto the wall's outward normal.
 *
 * @param {Object} placement - the Placement being drawn
 * @param {{width: number, length: number, wallHeight: number}} shedDimensions
 * @param {number} faceOffset - how far proud of the wall's outer face to sit.
 *   Pass `-WALL_THICKNESS / 2` to land exactly on the centre of the hole.
 * @returns {{position: number[], rotation: number[]}}
 */
export function openingTransform(placement, shedDimensions, faceOffset = 0) {
	const { wall, normalizedX, normalizedY } = placement;
	const { width, length, wallHeight } = shedDimensions;

	const span = wallSpan(wall, width, length);
	// Same expression the cut uses for its local X — that is the point.
	const along = -span / 2 + normalizedX * span;
	const y = normalizedY * wallHeight;
	const halfW = width / 2;
	const halfL = length / 2;

	switch (wall) {
		case 'front': return { position: [along, y, halfL + faceOffset],    rotation: [0, 0, 0] };
		case 'back':  return { position: [along, y, -(halfL + faceOffset)], rotation: [0, Math.PI, 0] };
		case 'left':  return { position: [-(halfW + faceOffset), y, along], rotation: [0, -Math.PI / 2, 0] };
		case 'right': return { position: [halfW + faceOffset, y, along],    rotation: [0, Math.PI / 2, 0] };
		default:      return { position: [0, y, 0], rotation: [0, 0, 0] };
	}
}

// One shared Evaluator — CSG is sequential so there is no concurrency issue.
const evaluator = new Evaluator();
// A wall is drawn with one material, so the result should be one un-grouped
// geometry rather than a grouped one addressing a material array.
evaluator.useGroups = false;

/**
 * Subtract one box per Placement from a wall's geometry.
 *
 * @param {THREE.BufferGeometry} baseGeometry - the uncut wall slab. Not
 *   modified; it is cloned before use.
 * @param {Array} placements - Placements on this wall only
 * @param {{localGeomWidth: number, wallHeight: number, wallThickness: number}} opts
 * @returns {THREE.BufferGeometry|null} the cut geometry, or `null` when there
 *   is nothing to cut. The caller owns the result and must dispose it.
 */
export function cutOpenings(baseGeometry, placements, opts) {
	if (!placements || placements.length === 0) return null;

	const { localGeomWidth, wallHeight, wallThickness } = opts;

	const cloned = baseGeometry.clone();
	let current = new Brush(cloned);
	current.updateMatrixWorld(true);

	// Everything allocated on the way to the final geometry, disposed at the end.
	const spent = [cloned];

	try {
		for (const p of placements) {
			// Opening centre in the wall's local XY plane
			const localX = -localGeomWidth / 2 + p.normalizedX * localGeomWidth;
			const localY = -wallHeight / 2 + p.normalizedY * wallHeight;

			// Slightly deeper than the wall so the cut clears both faces
			const cutGeometry = new THREE.BoxGeometry(p.width, p.height, wallThickness + 0.1);
			const cut = new Brush(cutGeometry);
			cut.position.set(localX, localY, 0);
			cut.updateMatrixWorld(true);

			const previous = current;
			current = evaluator.evaluate(current, cut, SUBTRACTION);
			current.updateMatrixWorld(true);

			if (previous.geometry !== cloned) spent.push(previous.geometry);
			spent.push(cutGeometry);
		}

		const result = current.geometry;
		for (const item of spent) {
			if (item !== result) item.dispose?.();
		}
		return result;
	} catch (err) {
		for (const item of spent) item.dispose?.();
		throw err;
	}
}
