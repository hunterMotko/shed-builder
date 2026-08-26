import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { computeMeshVolume } from 'three-bvh-csg';
import { cutOpenings } from './wallOpenings';

// A front wall on the default 12x16x10 Design: 12 ft wide, 10 ft tall,
// WALL_THICKNESS 0.5 ft.
const WALL_WIDTH = 12;
const WALL_HEIGHT = 10;
const WALL_THICKNESS = 0.5;

const wallGeometry = () =>
	new THREE.BoxGeometry(WALL_WIDTH, WALL_HEIGHT, WALL_THICKNESS);

const opts = {
	localGeomWidth: WALL_WIDTH,
	wallHeight: WALL_HEIGHT,
	wallThickness: WALL_THICKNESS,
};

// Volumes are worked out from the shed's dimensions by hand, not by running
// the cut a second time. A solid wall is w x h x t; each opening removes its
// own width x height x t, because the cut box is punched all the way through.
const SOLID_WALL_VOLUME = WALL_WIDTH * WALL_HEIGHT * WALL_THICKNESS; // 60 ft³

const windowAt = (normalizedX, normalizedY) => ({
	id: `w-${normalizedX}-${normalizedY}`,
	type: 'window',
	wall: 'front',
	normalizedX,
	normalizedY,
	width: 3,
	height: 3,
});

const volumeOf = (geometry) => computeMeshVolume(new THREE.Mesh(geometry));

describe('cutOpenings', () => {
	it('returns the wall untouched when there is nothing to cut', () => {
		const base = wallGeometry();

		expect(cutOpenings(base, [], opts)).toBeNull();
	});

	// The bug this test exists for: three-bvh-csg's Evaluator requires Brush
	// instances and throws on a plain THREE.Mesh. ShedWall passed Meshes, the
	// throw was swallowed by a catch, and every wall silently rendered solid.
	// A wall with a window in it must weigh less than a solid one.
	it('removes material from the wall', () => {
		const cut = cutOpenings(wallGeometry(), [windowAt(0.5, 0.5)], opts);

		expect(volumeOf(cut)).toBeLessThan(SOLID_WALL_VOLUME);
	});

	it('removes exactly the volume of one 3x3 window', () => {
		const cut = cutOpenings(wallGeometry(), [windowAt(0.5, 0.5)], opts);

		// 60 - (3 x 3 x 0.5) = 55.5
		expect(volumeOf(cut)).toBeCloseTo(55.5, 3);
	});

	it('removes both openings when a wall carries two', () => {
		const cut = cutOpenings(
			wallGeometry(),
			[windowAt(0.25, 0.5), windowAt(0.75, 0.5)],
			opts
		);

		// 60 - 2 x (3 x 3 x 0.5) = 51
		expect(volumeOf(cut)).toBeCloseTo(51, 3);
	});

	it('cuts a hole that spans the full thickness of the wall', () => {
		const cut = cutOpenings(wallGeometry(), [windowAt(0.5, 0.5)], opts);
		cut.computeBoundingBox();

		// The opening goes right through, so the wall's outer dimensions are
		// unchanged - only its volume drops.
		const size = cut.boundingBox.getSize(new THREE.Vector3());
		expect(size.x).toBeCloseTo(WALL_WIDTH, 6);
		expect(size.y).toBeCloseTo(WALL_HEIGHT, 6);
		expect(size.z).toBeCloseTo(WALL_THICKNESS, 6);
	});

	it('puts the hole where the Placement asked for it', () => {
		// A window low and to the left: centre at normalized (0.25, 0.25) is
		// x = -12/2 + 0.25*12 = -3, y = -10/2 + 0.25*10 = -2.5 in wall space.
		const cut = cutOpenings(wallGeometry(), [windowAt(0.25, 0.25)], opts);

		const pos = cut.getAttribute('position');
		let hitsInsideOpening = 0;
		for (let i = 0; i < pos.count; i++) {
			const x = pos.getX(i);
			const y = pos.getY(i);
			// Corners of the opening: x = -3 ± 1.5, y = -2.5 ± 1.5
			if (Math.abs(Math.abs(x - -3) - 1.5) < 1e-6 && Math.abs(Math.abs(y - -2.5) - 1.5) < 1e-6) {
				hitsInsideOpening++;
			}
		}
		expect(hitsInsideOpening).toBeGreaterThan(0);
	});
});
