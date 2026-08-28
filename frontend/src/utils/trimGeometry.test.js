import { describe, it, expect } from 'vitest';
import {
	cornerBoards,
	gableFasciaBoards,
	barnRakeFlashing,
	TRIM_THICKNESS,
	TRIM_WIDTH,
} from './trimGeometry';

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

// ── The fascia that boxes the roof slab's cut edge ───────────────────────────
//
// Expected values are trigonometry against the roof, never a second copy of
// what the function does. `gableFasciaBoards` exists because these have to be
// worked out from the ROOF and `GableTrim` was working them out from the wall:
// its rake boards sat on the gable end plane, and once the roof became a slab
// that runs past that plane (ADR-0013) they were buried under the overhang.

describe('gableFasciaBoards', () => {
	const ROOF_HEIGHT = 3; // 6:12 over a 6 ft half width
	const OVERHANG = 0.5;
	const THICK = 0.333;

	const boards = gableFasciaBoards(WIDTH, LENGTH, WALL_HEIGHT, ROOF_HEIGHT, {
		overhang: OVERHANG,
		roofThickness: THICK,
	});
	const by = (id) => boards.find((b) => b.id === id);

	it('gives four rakes and two eaves', () => {
		expect(boards).toHaveLength(6);
		expect(boards.filter((b) => b.id.startsWith('rake-'))).toHaveLength(4);
		expect(boards.filter((b) => b.id.startsWith('eave-'))).toHaveLength(2);
	});

	it('stands the rake outside the roof, not on the wall it used to sit on', () => {
		// The slab runs to halfL + overhang. A board on the gable end plane at
		// halfL is behind that and cannot be seen.
		expect(by('rake-front-left').position[2]).toBeGreaterThan(halfL + OVERHANG);
		expect(by('rake-back-left').position[2]).toBeLessThan(-(halfL + OVERHANG));
	});

	it('runs the rake the full slope, ridge to overhang tip', () => {
		// Rise from the tip to the ridge is the wall rise plus what the overhang
		// drops below the eave: 3 + 0.5 x (3/6) = 3.25, over a run of 6.5.
		const rake = by('rake-front-right');
		expect(rake.size[0]).toBeCloseTo(Math.hypot(6.5, 3.25), 10);
	});

	it('pitches the rake at the roof pitch', () => {
		// Not the wall-to-ridge angle: the board follows the slab, which carries
		// on past the wall at the same pitch.
		const rake = by('rake-front-right');
		expect(rake.rotation[2]).toBeCloseTo(-Math.atan2(3.25, 6.5), 10);
		expect(by('rake-front-left').rotation[2]).toBeCloseTo(Math.atan2(3.25, 6.5), 10);
	});

	it('hangs the eave below the top plate, where the rafter tail is', () => {
		// y = 0 in the roof profile is the eave AT THE WALL, so the tip is a
		// half-pitch-run lower — 0.25 ft here — and the board covers the slab.
		const eave = by('eave-right');
		expect(eave.position[1]).toBeCloseTo(WALL_HEIGHT - 0.25 - THICK / 2, 10);
	});

	it('runs the eave the whole length of the slab, so it meets both rakes', () => {
		expect(by('eave-left').size[2]).toBeCloseTo(LENGTH + 2 * OVERHANG, 10);
	});

	it('covers the slab edge, whatever the slab is', () => {
		const thicker = gableFasciaBoards(WIDTH, LENGTH, WALL_HEIGHT, ROOF_HEIGHT, {
			overhang: OVERHANG,
			roofThickness: 0.5,
		});
		for (const b of thicker) expect(b.size[1]).toBeCloseTo(0.5, 10);
	});
});

describe('barnRakeFlashing', () => {
	// The outline `gambrelEndOutline` returns, for a 12 ft barn at 20:12 over
	// 4:12 — eave, eave, knuckle, ridge, knuckle, worked out by hand: the
	// knuckle sits 5 ft out and 1 x 20/12 = 1.667 up, the ridge 1.667 + 5 x 4/12
	// = 3.333 up.
	const OUTLINE = [
		[-6, 0],
		[6, 0],
		[5, 5 / 3],
		[0, 10 / 3],
		[-5, 5 / 3],
	];
	const OVERHANG = 2 / 12;

	const bands = barnRakeFlashing(OUTLINE, LENGTH, WALL_HEIGHT, { overhang: OVERHANG });
	const by = (id) => bands.find((b) => b.id === id);

	it('gives four runs on each end', () => {
		expect(bands).toHaveLength(8);
		expect(bands.filter((b) => b.id.startsWith('rake-front-'))).toHaveLength(4);
	});

	it('walks the gambrel rather than closing the shape', () => {
		// The outline arrives in fill order — eave, eave, knuckle, ridge, knuckle
		// — so reading it as a path would draw a band straight across the eaves.
		// Every run must be one real edge of the gambrel.
		const lower = by('rake-front-left-lower');
		expect(lower.size[0]).toBeCloseTo(Math.hypot(1, 5 / 3), 10);
		const upper = by('rake-front-left-upper');
		expect(upper.size[0]).toBeCloseTo(Math.hypot(5, 5 / 3), 10);
	});

	it('lies at the pitch of the run it covers', () => {
		// 20:12 below the knuckle, 4:12 above it, and the lower one is steeper —
		// a barn whose lower slope is the shallow one is not a barn.
		const lower = by('rake-front-left-lower').rotation[2];
		const upper = by('rake-front-left-upper').rotation[2];
		expect(Math.tan(lower)).toBeCloseTo(20 / 12, 10);
		expect(Math.tan(upper)).toBeCloseTo(4 / 12, 10);
		expect(lower).toBeGreaterThan(upper);
	});

	it('sits just outside the slab on both ends', () => {
		const z = halfL + OVERHANG + TRIM_THICKNESS / 2;
		expect(by('rake-front-left-lower').position[2]).toBeCloseTo(z, 10);
		expect(by('rake-back-left-lower').position[2]).toBeCloseTo(-z, 10);
	});

	it('measures its heights from the eave, not from the floor', () => {
		// The outline is wall-relative: y = 0 is the eave.
		expect(by('rake-front-left-upper').position[1]).toBeCloseTo(
			WALL_HEIGHT + (5 / 3 + 10 / 3) / 2,
			10
		);
	});

	it('is TRIM_WIDTH on the face, like every other board', () => {
		for (const b of bands) expect(b.size[1]).toBeCloseTo(TRIM_WIDTH, 10);
	});
});
