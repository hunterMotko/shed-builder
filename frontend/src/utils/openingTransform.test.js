import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { WALL_THICKNESS, wallSpan, openingTransform } from './wallOpenings';
import { getWallNormalizedCoordinates } from './coordinateUtils';

// The default Design: 12 ft wide, 16 ft long, 10 ft walls.
const DIMS = { width: 12, length: 16, wallHeight: 10 };
const WALLS = ['front', 'back', 'left', 'right'];

const placement = (wall, normalizedX = 0.5, normalizedY = 0.5) => ({
	id: `p-${wall}`,
	type: 'door',
	wall,
	normalizedX,
	normalizedY,
	width: 3,
	height: 6.8,
});

/**
 * Where the CSG cut actually puts the hole, derived independently of
 * openingTransform: build the wall exactly as ShedWall positions it, put the
 * cut at its local coordinates, and read the world position back out of
 * three.js. This is the thing every opening component has to agree with.
 */
const holeCentreInWorld = (p) => {
	const { width, length, wallHeight } = DIMS;
	const halfW = width / 2;
	const halfL = length / 2;
	const tHalf = WALL_THICKNESS / 2;

	const wall = new THREE.Object3D();
	switch (p.wall) {
		case 'front': wall.position.set(0, wallHeight / 2, halfL - tHalf); break;
		case 'back':  wall.position.set(0, wallHeight / 2, -(halfL - tHalf)); break;
		case 'left':  wall.position.set(-(halfW - tHalf), wallHeight / 2, 0); wall.rotation.set(0, -Math.PI / 2, 0); break;
		case 'right': wall.position.set(halfW - tHalf, wallHeight / 2, 0); wall.rotation.set(0, -Math.PI / 2, 0); break;
	}
	wall.updateMatrixWorld(true);

	const span = (p.wall === 'front' || p.wall === 'back') ? width : length - WALL_THICKNESS * 2;
	const local = new THREE.Vector3(
		-span / 2 + p.normalizedX * span,
		-wallHeight / 2 + p.normalizedY * wallHeight,
		0
	);
	return wall.localToWorld(local);
};

describe('wallSpan', () => {
	it('gives front and back the full width of the shed', () => {
		expect(wallSpan('front', 12, 16)).toBe(12);
		expect(wallSpan('back', 12, 16)).toBe(12);
	});

	// Left and right stop short of the front and back walls at each end, which
	// is why a Placement on them cannot be measured against the full length.
	it('shortens left and right by a wall thickness at each end', () => {
		// 16 - 2 x 0.5 = 15
		expect(wallSpan('left', 12, 16)).toBe(15);
		expect(wallSpan('right', 12, 16)).toBe(15);
	});
});

describe('openingTransform', () => {
	// Issue #26: every opening component used the wall-LOCAL Y formula while
	// being positioned in shed space, putting it wallHeight/2 below its hole.
	it('puts normalizedY 0 on the floor and 1 at the eave', () => {
		for (const wall of WALLS) {
			expect(openingTransform(placement(wall, 0.5, 0), DIMS).position[1]).toBeCloseTo(0, 6);
			expect(openingTransform(placement(wall, 0.5, 1), DIMS).position[1]).toBeCloseTo(10, 6);
		}
	});

	it('puts a door a third of the way up where the Design asked for it', () => {
		// 0.34 x 10 ft = 3.4 ft above the floor
		expect(openingTransform(placement('front', 0.5, 0.34), DIMS).position[1]).toBeCloseTo(3.4, 6);
	});

	// Issue #17: on left and right walls the components measured normalizedX
	// across the full shedLength while the cut measured it across the wall.
	it('measures a left wall Placement across the wall, not the shed', () => {
		const { position } = openingTransform(placement('left', 0.25, 0.5), DIMS);

		// span 15, so a quarter along is -7.5 + 3.75 = -3.75 in Z.
		// Measured across the full 16 ft it would have been -8 + 4 = -4.
		expect(position[2]).toBeCloseTo(-3.75, 6);
	});

	// The invariant the whole helper exists for. Pull the transform back by
	// half a wall thickness and it must land exactly on the CSG hole, on every
	// wall, at any position on it.
	it('agrees with the CSG hole on every wall', () => {
		for (const wall of WALLS) {
			for (const [nx, ny] of [[0, 0], [0.25, 0.34], [0.5, 0.5], [0.9, 1]]) {
				const p = placement(wall, nx, ny);
				const { position } = openingTransform(p, DIMS, -WALL_THICKNESS / 2);
				const hole = holeCentreInWorld(p);

				expect(position[0]).toBeCloseTo(hole.x, 6);
				expect(position[1]).toBeCloseTo(hole.y, 6);
				expect(position[2]).toBeCloseTo(hole.z, 6);
			}
		}
	});

	it('sits proud of the wall by the offset it is given', () => {
		const off = 0.3;
		// Front wall outer face is at +halfLength = 8.
		expect(openingTransform(placement('front'), DIMS, off).position[2]).toBeCloseTo(8.3, 6);
		expect(openingTransform(placement('back'), DIMS, off).position[2]).toBeCloseTo(-8.3, 6);
		// Left/right outer faces at ∓halfWidth = ∓6.
		expect(openingTransform(placement('left'), DIMS, off).position[0]).toBeCloseTo(-6.3, 6);
		expect(openingTransform(placement('right'), DIMS, off).position[0]).toBeCloseTo(6.3, 6);
	});

	// A click on a wall gives a world point; getWallNormalizedCoordinates turns
	// it back into a Placement. Placing that Placement must return the point it
	// came from, or a door lands somewhere other than where the user clicked.
	it('round-trips through getWallNormalizedCoordinates', () => {
		for (const wall of WALLS) {
			for (const [nx, ny] of [[0.1, 0.2], [0.5, 0.5], [0.85, 0.9]]) {
				const p = placement(wall, nx, ny);
				// The point a raycast returns is on the wall's outer face.
				const { position } = openingTransform(p, DIMS);
				const point = { x: position[0], y: position[1], z: position[2] };

				const back = getWallNormalizedCoordinates(
					point, wall, DIMS.width, DIMS.length, DIMS.wallHeight
				);

				expect(back.normalizedX).toBeCloseTo(nx, 6);
				expect(back.normalizedY).toBeCloseTo(ny, 6);
			}
		}
	});

	// Each component builds its geometry facing local +Z, so the rotation has
	// to carry local +Z onto that wall's outward normal. Anything else renders
	// the door facing into the shed.
	it('faces every opening out of the shed', () => {
		const outward = {
			front: [0, 0, 1],
			back:  [0, 0, -1],
			left:  [-1, 0, 0],
			right: [1, 0, 0],
		};

		for (const wall of WALLS) {
			const { rotation } = openingTransform(placement(wall), DIMS);
			const facing = new THREE.Vector3(0, 0, 1).applyEuler(
				new THREE.Euler(...rotation)
			);
			const [x, y, z] = outward[wall];
			expect(facing.x).toBeCloseTo(x, 6);
			expect(facing.y).toBeCloseTo(y, 6);
			expect(facing.z).toBeCloseTo(z, 6);
		}
	});
});
