import * as THREE from 'three';
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg';
import {
	wallSpan as kernelWallSpan,
	openingTransform as kernelOpeningTransform,
	wallPanelForSpan as kernelWallPanel,
} from '../kernel';

/**
 * Cutting Openings out of a wall.
 *
 * Extracted from ShedWall so the cut can be tested without mounting React —
 * it is pure geometry in, geometry out. The cut happens in the wall's own
 * local space (ADR-0001), so a wall's local X always runs along its own width
 * no matter which side of the shed it is.
 *
 * `wallSpan` and `openingTransform` are no longer computed here: they are the
 * Rust kernel's, called through `../kernel`. The wrappers below stay so that
 * every existing import keeps working, and so the change is one seam rather
 * than forty call sites. See the kernel repo's `docs/adr/0002`.
 *
 * One behaviour changed with them. Both used to answer for a wall name they did
 * not recognise — `openingTransform` with a position at the centre of the shed
 * — and the kernel throws instead, naming the offender. Nothing in this app
 * passes a name off the list, so nothing should notice.
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
	return kernelWallSpan(wall, shedWidth, shedLength);
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
	return kernelOpeningTransform(placement, shedDimensions, faceOffset);
}

// One shared Evaluator — CSG is sequential so there is no concurrency issue.
const evaluator = new Evaluator();
// A wall is drawn with one material, so the result should be one un-grouped
// geometry rather than a grouped one addressing a material array.
evaluator.useGroups = false;

/**
 * The wall panel: what is left of a wall once every Opening is removed.
 *
 * No longer a CSG subtraction. The kernel builds the outline analytically and
 * triangulates it — see the kernel repo's `docs/adr/0001`. The signature is
 * unchanged so that `ShedWall` and this file's tests are not touched by the
 * swap; `baseGeometry` is now unused, because the panel is generated rather than
 * cut from anything.
 *
 * What changes, and what does not:
 *
 * - The **surface** is the same rectangle less the same rectangles, so the
 *   render is unchanged. The tessellation is different — a triangulated polygon
 *   rather than whatever the evaluator left behind — but the siding shader draws
 *   from position and normal, not from UVs or triangle layout.
 * - An Opening that hangs below the floor is a **notch** rather than a hole, and
 *   two that overlap are **one** hole. CSG gave both for free; a hole ring per
 *   Placement would not, which is why ADR-0001 had to be amended.
 * - Openings that remove the whole wall, or cut it into disconnected pieces, now
 *   **throw** instead of quietly producing something unbuildable. `ShedWall`
 *   already catches and falls back to the uncut wall, which is the right
 *   handling and is why nothing here does it.
 *
 * `null` for a wall with nothing to cut, exactly as before: the caller renders
 * its own plain box and no geometry is allocated.
 *
 * @param {THREE.BufferGeometry} baseGeometry - unused; kept so callers need not
 *   change. The panel is generated from the span and the Placements.
 * @param {Array} placements - the Placements on THIS wall
 * @param {{localGeomWidth: number, wallHeight: number}} opts
 * @returns {THREE.BufferGeometry|null}
 */
export function cutOpenings(baseGeometry, placements, opts) {
	if (!placements || placements.length === 0) return null;

	const { localGeomWidth, wallHeight } = opts;
	const panel = kernelWallPanel(localGeomWidth, wallHeight, placements);
	try {
		const geometry = new THREE.BufferGeometry();
		// Copies out of wasm memory, once. A view would detach the moment the
		// wasm heap grew, and this geometry outlives the call.
		geometry.setAttribute('position', new THREE.BufferAttribute(panel.positions(), 3));
		geometry.setAttribute('normal', new THREE.BufferAttribute(panel.normals(), 3));
		geometry.setAttribute('uv', new THREE.BufferAttribute(panel.uvs(), 2));
		geometry.setIndex(new THREE.BufferAttribute(panel.indices(), 1));
		geometry.computeBoundingSphere();
		return geometry;
	} finally {
		// wasm-bindgen handles are not garbage collected.
		panel.free();
	}
}
