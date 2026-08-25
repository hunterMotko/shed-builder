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
