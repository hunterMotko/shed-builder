import { describe, it, expect } from 'vitest';
import { cornerBoards, TRIM_THICKNESS, TRIM_WIDTH } from './trimGeometry';

// A 12x20 shed. The wall outer faces land on round numbers, which is what
// makes the expected values below checkable by hand: ShedWall puts the front
// wall's outer face at z = length/2 and the right wall's at x = width/2.
const WIDTH = 12;
const LENGTH = 20;
const WALL_HEIGHT = 8;

const halfW = WIDTH / 2;   // 6.0 — the plane the left/right siding sits on
const halfL = LENGTH / 2;  // 10.0 — the plane the front/back siding sits on

const boards = () => cornerBoards(WIDTH, LENGTH, WALL_HEIGHT);

/** Axis-aligned bounds of a board, as [min, max] per axis. */
const boundsOf = ({ position, size }) =>
	position.map((c, axis) => [c - size[axis] / 2, c + size[axis] / 2]);

/**
 * How much of a board lies inside the wall volume.
 *
 * The wall envelope is the box the siding encloses: x and z out to the outer
 * faces, floor to eave. A board nailed onto the siding touches this box and
 * never enters it, so the overlap is zero. Touching faces overlap by zero
 * width, which is why this measures volume and not intersection.
 */
const volumeInsideWalls = (board) => {
	const envelope = [[-halfW, halfW], [0, WALL_HEIGHT], [-halfL, halfL]];
	return boundsOf(board).reduce((volume, [lo, hi], axis) => {
		const [eLo, eHi] = envelope[axis];
		return volume * Math.max(0, Math.min(hi, eHi) - Math.max(lo, eLo));
	}, 1);
};

describe('cornerBoards', () => {
	it('trims all four corners on both of the faces that meet there', () => {
		const all = boards();
		expect(all).toHaveLength(8);

		const byCorner = {};
		for (const board of all) {
			byCorner[board.corner] = byCorner[board.corner] ?? [];
			byCorner[board.corner].push(board.face);
		}

		expect(Object.keys(byCorner).sort()).toEqual([
			'back-left', 'back-right', 'front-left', 'front-right',
		]);
		// Each corner is where two walls meet, and both need covering.
		expect(byCorner['front-right'].sort()).toEqual(['front', 'right']);
		expect(byCorner['front-left'].sort()).toEqual(['front', 'left']);
		expect(byCorner['back-right'].sort()).toEqual(['back', 'right']);
		expect(byCorner['back-left'].sort()).toEqual(['back', 'left']);
	});

	it('keeps every board out of the wall volume', () => {
		// Issue #31: the boards were buried in the siding with their outer
		// faces exactly coplanar, so nothing decided which surface won and each
		// board rendered as hatched noise.
		for (const board of boards()) {
			expect(volumeInsideWalls(board)).toBeCloseTo(0, 10);
		}
	});

	it('lands each board against the siding it is nailed to', () => {
		// Proud of the wall, but touching it — a gap would show daylight.
		for (const board of boards()) {
			const [[minX, maxX], , [minZ, maxZ]] = boundsOf(board);
			if (board.face === 'front') expect(minZ).toBeCloseTo(halfL, 10);
			if (board.face === 'back') expect(maxZ).toBeCloseTo(-halfL, 10);
			if (board.face === 'right') expect(minX).toBeCloseTo(halfW, 10);
			if (board.face === 'left') expect(maxX).toBeCloseTo(-halfW, 10);
		}
	});

	it('laps the face board over the side board so the corner has no gap', () => {
		const all = boards();
		const front = all.find((b) => b.corner === 'front-right' && b.face === 'front');
		const side = all.find((b) => b.corner === 'front-right' && b.face === 'right');

		// Worked out from the shed rather than from the function: the right
		// wall's siding is at x = 6.0, so a board on it stands proud to
		// 6.0 + 0.0625. The front board has to reach that same x to hide the
		// side board's end grain, and it starts a board's width back from the
		// corner at 6.0 - 0.333.
		const [[frontMinX, frontMaxX]] = boundsOf(front);
		expect(frontMaxX).toBeCloseTo(halfW + TRIM_THICKNESS, 10);
		expect(frontMinX).toBeCloseTo(halfW - TRIM_WIDTH, 10);

		const [[sideMinX, sideMaxX], , [sideMinZ, sideMaxZ]] = boundsOf(side);
		expect(sideMaxX).toBeCloseTo(halfW + TRIM_THICKNESS, 10);
		expect(sideMinX).toBeCloseTo(halfW, 10);
		// The side board stops at the front siding, where the front board takes over.
		expect(sideMaxZ).toBeCloseTo(halfL, 10);
		expect(sideMinZ).toBeCloseTo(halfL - TRIM_WIDTH, 10);
	});

	it('runs the boards floor to eave', () => {
		for (const board of boards()) {
			const [, [minY, maxY]] = boundsOf(board);
			expect(minY).toBeCloseTo(0, 10);
			expect(maxY).toBeCloseTo(WALL_HEIGHT, 10);
		}
	});
});
