import { describe, it, expect } from 'vitest';
import {
	cornerBoards,
	gableFasciaBoards,
	barnRakeFlashing,
	barnKnuckleFlashing,
	gableCornerBoxes,
	roofRidgeCap,
	rakeJChannel,
	bandUnderside,
	eaveFasciaDrop,
	RAKE_REVEAL,
	FLY_FACE,
	J_CHANNEL_FACE,
	J_CHANNEL_LAP,
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

/**
 * How far below a line a point lies, measured perpendicular to it.
 *
 * Signed via the cross product, so a point lapped OVER the line — the way the
 * J-channel is bent over the panel edge — comes out negative. The line is
 * given by two of its own points, never by the offset the code applied.
 */
const belowLine = ([ax, ay], [bx, by], [px, py]) =>
	((bx - ax) * (ay - py) - (by - ay) * (ax - px)) / Math.hypot(bx - ax, by - ay);

/**
 * Read a band's outline back as its two edges and its two end corners.
 *
 * `mitredBand` walks the top edge left to right, turns the right end, walks the
 * bottom edge back, and turns the left end. An end is a single plumb cut and
 * contributes no point of its own, unless a flat bottom takes the corner off
 * it, which adds one. So the caller says how many points the surface line had
 * and the rest follows.
 */
const edgesOf = (outline, points) => {
	const perEnd = (outline.length - 2 * points) / 2;
	return {
		top: outline.slice(0, points),
		bottom: outline.slice(points + perEnd, 2 * points + perEnd).reverse(),
		// Left end first, to read the same way round as the edges do.
		corners: perEnd ? [outline.at(-1), outline[points]] : [],
	};
};

/** Axis-aligned bounds of a box, as [min, max] per axis. */
const boundsOf = ({ position, size }) =>
	position.map((c, axis) => [c - size[axis] / 2, c + size[axis] / 2]);

/**
 * The same, for a piece given as an outline extruded along Z.
 *
 * X and Y come from the outline; Z is the extrusion, which runs from the
 * position forwards.
 */
const outlineBounds = ({ outline, position, depth }) => [
	[Math.min(...outline.map(([x]) => x)), Math.max(...outline.map(([x]) => x))],
	[Math.min(...outline.map(([, y]) => y)), Math.max(...outline.map(([, y]) => y))],
	[position[2], position[2] + depth],
];

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
	return outlineBounds(board).reduce((volume, [lo, hi], axis) => {
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
			const [[minX, maxX], , [minZ, maxZ]] = outlineBounds(board);
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
		const [[frontMinX, frontMaxX]] = outlineBounds(front);
		expect(frontMaxX).toBeCloseTo(halfW + TRIM_THICKNESS, 10);
		expect(frontMinX).toBeCloseTo(halfW - TRIM_WIDTH, 10);

		const [[sideMinX, sideMaxX], , [sideMinZ, sideMaxZ]] = outlineBounds(side);
		expect(sideMaxX).toBeCloseTo(halfW + TRIM_THICKNESS, 10);
		expect(sideMinX).toBeCloseTo(halfW, 10);
		// The side board stops at the front siding, where the front board takes over.
		expect(sideMaxZ).toBeCloseTo(halfL, 10);
		expect(sideMinZ).toBeCloseTo(halfL - TRIM_WIDTH, 10);
	});

	it('runs the boards floor to eave', () => {
		for (const board of boards()) {
			const [, [minY, maxY]] = outlineBounds(board);
			expect(minY).toBeCloseTo(0, 10);
			expect(maxY).toBeCloseTo(WALL_HEIGHT, 10);
		}
	});

	it('keeps the bottom flat on the floor whatever the top does', () => {
		// The top is cut to fit the roof and the bottom never is: it sits on
		// the deck, which is what y = 0 means here.
		for (const board of cornerBoards(WIDTH, LENGTH, WALL_HEIGHT, {
			topAt: (x) => WALL_HEIGHT - Math.abs(x),
		})) {
			const bottom = board.outline.filter(([, y]) => y === 0);
			expect(bottom).toHaveLength(2);
			expect(bottom[0][1]).toBe(bottom[1][1]);
		}
	});

	it('cuts the top to the line it is given, across the board', () => {
		// A Barn's gambrel drops 20 in every 12 across a corner board, so there
		// is no level cut that both meets the fly and stays out of the roof.
		// The board takes its top from the line, at each of its own edges.
		const topAt = (x) => WALL_HEIGHT - 0.5 * Math.abs(x);
		const all = cornerBoards(WIDTH, LENGTH, WALL_HEIGHT, { topAt });

		for (const board of all) {
			for (const [x, y] of board.outline) {
				if (y !== 0) expect(y).toBeCloseTo(topAt(x), 10);
			}
		}

		// And that really is a slope, not a level cut at some average.
		const front = all.find((b) => b.corner === 'front-right' && b.face === 'front');
		const [, [minY, maxY]] = outlineBounds(front);
		expect(maxY - minY).toBeGreaterThan(0);
		expect(maxY).toBeCloseTo(topAt(halfW - TRIM_WIDTH), 10);
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

	// A 6:12 rake: 1 ft along the slope is hypot(1, 0.5) ft measured plumb, and
	// the overhang tip hangs half its own run below the eave at the wall.
	const PER_RUN = Math.hypot(1, 0.5);
	const OUTER_X = halfW + OVERHANG; // 6.5
	const TIP_DROP = OVERHANG * 0.5;  // 0.25

	const { rakes, eaves } = gableFasciaBoards(WIDTH, LENGTH, WALL_HEIGHT, ROOF_HEIGHT, {
		overhang: OVERHANG,
		roofThickness: THICK,
	});
	const by = (id) => [...rakes, ...eaves].find((b) => b.id === id);

	it('gives one mitred rake per gable end and an eave down each side', () => {
		expect(rakes.map((r) => r.id)).toEqual(['rake-front', 'rake-back']);
		expect(eaves.map((e) => e.id).sort()).toEqual(['eave-left', 'eave-right']);
	});

	it('stands the rake outside the roof, not on the wall it used to sit on', () => {
		// The slab runs to halfL + overhang. A board on the gable end plane at
		// halfL is behind that and cannot be seen.
		expect(by('rake-front').position[2]).toBeCloseTo(halfL + OVERHANG, 10);
		expect(by('rake-back').position[2]).toBeCloseTo(
			-(halfL + OVERHANG) - TRIM_THICKNESS,
			10
		);
		for (const r of rakes) expect(r.depth).toBeCloseTo(TRIM_THICKNESS, 10);
	});

	it('mitres the two runs to a single point on the plumb line under the apex', () => {
		// Cut square they crossed in an X at the peak, each poking past the
		// opposing slope's silhouette. Offset the same distance from two slopes
		// that are mirror images, the edges can only meet on the axis of
		// symmetry — and a perpendicular drop of RAKE_REVEAL is PER_RUN times
		// as far measured straight down.
		const { top, bottom } = edgesOf(by('rake-front').outline, 3);
		expect(top).toHaveLength(3);

		expect(top[1][0]).toBeCloseTo(0, 10);
		expect(top[1][1]).toBeCloseTo(ROOF_HEIGHT - RAKE_REVEAL * PER_RUN, 10);
		expect(bottom[1][0]).toBeCloseTo(0, 10);
		expect(bottom[1][1]).toBeCloseTo(top[1][1] - THICK, 10);
	});

	it('cuts both ends plumb, at the slab edge', () => {
		const { top, bottom } = edgesOf(by('rake-front').outline, 3);
		expect(top[0][0]).toBeCloseTo(-OUTER_X, 10);
		expect(bottom[0][0]).toBeCloseTo(-OUTER_X, 10);
		expect(top[2][0]).toBeCloseTo(OUTER_X, 10);
		expect(bottom[2][0]).toBeCloseTo(OUTER_X, 10);
	});

	it('covers the slab edge, which is roofThickness measured straight down', () => {
		// The slab is cut plumb — `slabFrom` drops the top line vertically — so
		// the board over it is roofThickness plumb, not roofThickness across the
		// board. Across, it hung a further 1/cos deep and finished below the
		// eave fascia it meets.
		const { top, bottom } = edgesOf(by('rake-front').outline, 3);
		for (let i = 0; i < top.length; i++) {
			expect(top[i][1] - bottom[i][1]).toBeCloseTo(THICK, 10);
		}
	});

	it('hangs the rake below the metal, by the reveal the J-channel fills', () => {
		// Perpendicular distance from the band's top edge down to the slope it
		// follows: the front-right run goes (0, 3) at the ridge to (6.5, -0.25)
		// at the tip.
		const { top } = edgesOf(by('rake-front').outline, 3);
		expect(belowLine([0, ROOF_HEIGHT], [OUTER_X, -TIP_DROP], top[2])).toBeCloseTo(
			RAKE_REVEAL,
			10
		);
	});

	it('hangs the eave below the top plate, where the rafter tail is', () => {
		// y = 0 in the roof profile is the eave AT THE WALL, so the tip is a
		// half-pitch-run lower, and the fascia hangs the rake's own reveal below
		// that — measured plumb, because the board is level.
		const eave = by('eave-right');
		expect(eave.position[1]).toBeCloseTo(
			WALL_HEIGHT - TIP_DROP - RAKE_REVEAL * PER_RUN - THICK / 2,
			10
		);
		expect(eaveFasciaDrop(0.5)).toBeCloseTo(RAKE_REVEAL * PER_RUN, 10);
	});

	it('meets the rake flush at the corner, top edge and bottom', () => {
		// The whole point of tying the two reveals together: the rake's plumb
		// cut and the eave board's end face have to be the same rectangle, or
		// the fascia steps as it turns the corner. It stepped an inch and a half.
		const { top, bottom } = edgesOf(by('rake-front').outline, 3);
		const eave = by('eave-right');
		expect(eave.position[1] + eave.size[1] / 2).toBeCloseTo(WALL_HEIGHT + top[2][1], 10);
		expect(eave.position[1] - eave.size[1] / 2).toBeCloseTo(WALL_HEIGHT + bottom[2][1], 10);
	});

	it('runs the eave past the slab at each end, so it laps the rake', () => {
		// Stopping at the slab left the corner of the overhang open: nothing
		// covered the board's thickness between the rake's plumb cut and the
		// eave's own outer face.
		expect(by('eave-left').size[2]).toBeCloseTo(
			LENGTH + 2 * (OVERHANG + TRIM_THICKNESS),
			10
		);
		const eave = by('eave-right');
		expect(eave.position[2] + eave.size[2] / 2).toBeGreaterThanOrEqual(
			by('rake-front').position[2] + by('rake-front').depth
		);
	});
});

describe('barnRakeFlashing', () => {
	// The slab top line for a 12 ft barn at 20:12 over 4:12 with a 2 in
	// overhang, worked out by hand: the knuckle sits 5 ft out and
	// 1 x 20/12 = 5/3 up, the ridge 5/3 + 5 x 4/12 = 10/3 up, and the eave tip
	// runs 1/6 further out and 1/6 x 20/12 = 5/18 below the wall eave.
	const TOPLINE = [
		[-6 - 1 / 6, -5 / 18],
		[-5, 5 / 3],
		[0, 10 / 3],
		[5, 5 / 3],
		[6 + 1 / 6, -5 / 18],
	];
	const OVERHANG = 2 / 12;
	const THICK = 0.333;

	const bands = barnRakeFlashing(TOPLINE, LENGTH, WALL_HEIGHT, {
		overhang: OVERHANG,
		roofThickness: THICK,
	});
	const by = (id) => bands.find((b) => b.id === id);

	it('gives one band per end, four runs long', () => {
		expect(bands.map((b) => b.id)).toEqual(['rake-front', 'rake-back']);
		// Five points along the surface, so five along each edge of the band.
		expect(edgesOf(by('rake-front').outline, 5).top).toHaveLength(5);
	});

	it('mitres the joints at both Knuckles and the ridge', () => {
		// Cut square, each run's end jutted past the roof's silhouette at every
		// joint. Mitred, the joint is a single point on both edges, and it lies
		// on the bisector — which for the ridge is the plumb line.
		const { top, bottom } = edgesOf(by('rake-front').outline, 5);
		expect(top[2][0]).toBeCloseTo(0, 10);
		expect(bottom[2][0]).toBeCloseTo(0, 10);

		// Every interior joint sits strictly inside the roof, below the surface
		// point it mitres, and the band never doubles back on itself.
		for (let i = 1; i < top.length - 1; i++) {
			expect(top[i][1]).toBeLessThan(TOPLINE[i][1]);
			expect(top[i][0]).toBeGreaterThan(top[i - 1][0]);
		}
	});

	it('lies against the slab end cap, which runs the overhang past the siding', () => {
		expect(by('rake-front').position[2]).toBeCloseTo(halfL + OVERHANG, 10);
		expect(by('rake-back').position[2]).toBeCloseTo(
			-(halfL + OVERHANG) - TRIM_THICKNESS,
			10
		);
		for (const b of bands) expect(b.depth).toBeCloseTo(TRIM_THICKNESS, 10);
	});

	it('keeps every scrap of white below the metal, on both slopes', () => {
		// Point-line distance from the band's top edge to the run it follows.
		// Signed via the cross product, so a band lapped OVER the edge comes out
		// negative — the fly goes under the panel, never over it.
		const { top } = edgesOf(by('rake-front').outline, 5);
		for (const [i, a] of TOPLINE.slice(0, -1).entries()) {
			expect(belowLine(a, TOPLINE[i + 1], top[i])).toBeCloseTo(RAKE_REVEAL, 10);
		}
	});

	it('shows a flat 2x4 on the face, not a 4 in board', () => {
		// 1.5 in: on `barn_barndoors.jpg` the white under the metal is 5-6 px at
		// 3.4 px/in. The 4 in it used to be was the whole white-plus-metal stack
		// measured as one band. Perpendicular to each run, so the flat bottom
		// that shortens the end run cannot flatter the answer.
		const { bottom } = edgesOf(by('rake-front').outline, 5);
		for (const [i, a] of TOPLINE.slice(0, -1).entries()) {
			expect(belowLine(a, TOPLINE[i + 1], bottom[i])).toBeCloseTo(
				RAKE_REVEAL + FLY_FACE,
				10
			);
		}
	});

	it('finishes the fly flat where the metal stops', () => {
		// A plumb cut on a 20:12 run leaves a long point below the band: the
		// bottom edge reached the eave two and a half inches under the slab's own
		// underside, which is where the metal stops. On the photographs the white
		// ends in a level foot and the corner board takes over below it.
		const { bottom, corners } = edgesOf(by('rake-front').outline, 5);
		const floor = TOPLINE[0][1] - THICK;
		const [left, right] = corners;

		// The level cut meets the plumb one at the outer edge, on both ends.
		expect(left[0]).toBeCloseTo(TOPLINE[0][0], 10);
		expect(right[0]).toBeCloseTo(TOPLINE[4][0], 10);
		expect(left[1]).toBeCloseTo(floor, 10);
		expect(right[1]).toBeCloseTo(floor, 10);

		// The flat runs back inboard from it, and no part of the band is below.
		expect(bottom[0][1]).toBeCloseTo(floor, 10);
		expect(bottom[0][0]).toBeGreaterThan(TOPLINE[0][0]);
		for (const [, y] of by('rake-front').outline) {
			expect(y).toBeGreaterThanOrEqual(floor - 1e-12);
		}
	});

	it('leaves a plain plumb end where nothing hangs below the roof', () => {
		// The cut is a fix for the Barn's steep lower slope, not a new rule for
		// every band: a slab thick enough to reach past the fly leaves the end
		// alone, and the outline goes back to two points per edge and no corner.
		const [flat] = barnRakeFlashing(TOPLINE, LENGTH, WALL_HEIGHT, {
			overhang: OVERHANG,
			roofThickness: 2,
		});
		expect(edgesOf(flat.outline, 5).corners).toEqual([]);
	});
});

describe('bandUnderside', () => {
	// The same 12 ft barn at 20:12 over 4:12 with a 2 in overhang.
	const TOPLINE = [
		[-6 - 1 / 6, -5 / 18],
		[-5, 5 / 3],
		[0, 10 / 3],
		[5, 5 / 3],
		[6 + 1 / 6, -5 / 18],
	];

	it('follows the run the x falls on, a whole band below it', () => {
		const under = bandUnderside(TOPLINE, { reveal: RAKE_REVEAL, faceWidth: FLY_FACE });
		// One point on the steep lower run and one on the shallow upper run,
		// each checked perpendicular to the run it belongs to.
		expect(belowLine(TOPLINE[0], TOPLINE[1], [-5.5, under(-5.5)])).toBeCloseTo(
			RAKE_REVEAL + FLY_FACE,
			10
		);
		expect(belowLine(TOPLINE[1], TOPLINE[2], [-2, under(-2)])).toBeCloseTo(
			RAKE_REVEAL + FLY_FACE,
			10
		);
	});

	it('gives the surface itself for a band of no width', () => {
		// Which is how a Barn's corner boards find the roof they stop under:
		// the surface, less the slab's thickness, which `slabFrom` drops plumb.
		const surface = bandUnderside(TOPLINE, { reveal: 0, faceWidth: 0 });
		for (const [x, y] of TOPLINE) expect(surface(x)).toBeCloseTo(y, 10);
		// And between the points, on the line the two of them make.
		expect(surface(-5.5)).toBeCloseTo(-5 / 18 + (6 + 1 / 6 - 5.5) * (20 / 12), 10);
	});

	it('carries the end runs on past the roof, for a board standing proud', () => {
		// A corner board reaches trimThickness past the siding, which on the
		// widest board is still inside the overhang — but the function must not
		// fall over if a caller asks beyond the line's own ends.
		const under = bandUnderside(TOPLINE, { reveal: RAKE_REVEAL, faceWidth: FLY_FACE });
		expect(under(-7)).toBeLessThan(under(-6));
		expect(Number.isFinite(under(7))).toBe(true);
	});
});

describe('barnKnuckleFlashing', () => {
	// Same 12 ft barn at 20:12 over 4:12: knuckles at (±5, 5/3), ridge (0, 10/3).
	const OUTLINE = [
		[-6, 0],
		[6, 0],
		[5, 5 / 3],
		[0, 10 / 3],
		[-5, 5 / 3],
	];
	const OVERHANG = 2 / 12;

	const caps = barnKnuckleFlashing(OUTLINE, LENGTH, WALL_HEIGHT, {
		overhang: OVERHANG,
	});
	const by = (id) => caps.find((c) => c.id === id);

	it('caps both Knuckles with two legs each', () => {
		expect(caps.map((c) => c.id).sort()).toEqual([
			'knuckle-left-lower',
			'knuckle-left-upper',
			'knuckle-right-lower',
			'knuckle-right-upper',
		]);
	});

	it('runs the whole slab, overhang included, centred on the shed', () => {
		for (const c of caps) {
			expect(c.size[2]).toBeCloseTo(LENGTH + 2 * OVERHANG, 10);
			expect(c.position[2]).toBeCloseTo(0, 10);
		}
	});

	it('lies at the pitch of the slope each leg laps', () => {
		// 4:12 above the break, 20:12 below it — pitch as |rise/run|, so the
		// direction the leg is walked in cannot flip the answer.
		expect(Math.abs(Math.tan(by('knuckle-right-upper').rotation[2]))).toBeCloseTo(4 / 12, 10);
		expect(Math.abs(Math.tan(by('knuckle-right-lower').rotation[2]))).toBeCloseTo(20 / 12, 10);
	});

	it('sits on the weather side of the panel, not inside the roof', () => {
		// The lower slope's surface line runs from the knuckle (5, 5/3) to the
		// eave (6, 0). The leg's centre must sit above that line — off the
		// surface — or the flashing is buried in the slab.
		const c = by('knuckle-right-lower');
		const surfaceY = 5 / 3 - (5 / 3) * (c.position[0] - 5);
		expect(c.position[1] - WALL_HEIGHT).toBeGreaterThan(surfaceY);
	});
});

describe('gableCornerBoxes', () => {
	const ROOF_HEIGHT = 3; // 6:12 over a 6 ft half width
	const OVERHANG = 0.5;
	const THICK = 0.333;

	const boxes = gableCornerBoxes(WIDTH, LENGTH, WALL_HEIGHT, ROOF_HEIGHT, {
		overhang: OVERHANG,
		roofThickness: THICK,
	});
	const by = (id) => boxes.find((b) => b.id === id);

	it('boxes all four corners of the overhang', () => {
		expect(boxes.map((b) => b.id).sort()).toEqual([
			'corner-box-back-left',
			'corner-box-back-right',
			'corner-box-front-left',
			'corner-box-front-right',
		]);
	});

	it('fills the plan corner from the wall out to the slab edges', () => {
		// The slab runs to halfW + overhang and halfL + overhang; the fascia
		// boards sit just past those planes and give the box its outer faces.
		const [[minX, maxX], , [minZ, maxZ]] = boundsOf(by('corner-box-front-right'));
		expect(minX).toBeCloseTo(halfW, 10);
		expect(maxX).toBeCloseTo(halfW + OVERHANG, 10);
		expect(minZ).toBeCloseTo(halfL, 10);
		expect(maxZ).toBeCloseTo(halfL + OVERHANG, 10);
	});

	it('hangs level with the eave fascia at the overhang tip', () => {
		// The tip is a half-pitch-run below the top plate: 0.5 x (3/6) = 0.25,
		// and the fascia hangs the rake's own reveal below that — the box closes
		// the corner between the two, so it has to come off the same line.
		expect(by('corner-box-back-left').position[1]).toBeCloseTo(
			WALL_HEIGHT - 0.25 - RAKE_REVEAL * Math.hypot(1, 0.5) - THICK / 2,
			10
		);
	});
});

describe('roofRidgeCap', () => {
	// A 6:12 gable peaking 3 ft over the wall, with a 6 in overhang.
	const caps = roofRidgeCap(3, 0.5, LENGTH, WALL_HEIGHT, { overhang: 0.5 });
	const by = (id) => caps.find((c) => c.id === id);

	it('folds one leg down each slope', () => {
		expect(caps.map((c) => c.id).sort()).toEqual(['ridge-cap-left', 'ridge-cap-right']);
	});

	it('runs the whole slab, overhang included, centred on the shed', () => {
		for (const c of caps) {
			expect(c.size[2]).toBeCloseTo(LENGTH + 1, 10);
			expect(c.position[2]).toBeCloseTo(0, 10);
		}
	});

	it('lies at the pitch of its slope, mirrored across the ridge', () => {
		expect(Math.tan(by('ridge-cap-right').rotation[2])).toBeCloseTo(-0.5, 10);
		expect(Math.tan(by('ridge-cap-left').rotation[2])).toBeCloseTo(0.5, 10);
	});

	it('sits on the weather side, just off the panel at the peak', () => {
		// Each leg's centre must be above its own slope line y = 3 - 0.5|x|,
		// but by no more than the metal's own thickness and lift.
		for (const c of caps) {
			const surface = WALL_HEIGHT + 3 - 0.5 * Math.abs(c.position[0]);
			expect(c.position[1]).toBeGreaterThan(surface);
			expect(c.position[1] - surface).toBeLessThan(0.1);
		}
	});
});

describe('roofRidgeCap with a ridge skylight', () => {
	// The same 6:12 gable, 20 ft long over a 6 in overhang, so the ridge line
	// runs 21 ft end to end. An 8 ft skylight sits centred in it, which leaves
	// 13 ft of cap: 6.5 ft each side of the glass, reaching from the eave tip
	// at |z| = 10.5 in to the edge of the glass at |z| = 4, and so centred at
	// |z| = 7.25.
	const RUN = 8;
	const runs = roofRidgeCap(3, 0.5, LENGTH, WALL_HEIGHT, {
		overhang: 0.5,
		skylightFt: RUN,
	});
	const caps = runs.filter((r) => r.kind === 'cap');

	it('breaks each leg into a cap either side of the glass', () => {
		expect(caps).toHaveLength(4);
		for (const c of caps) {
			expect(c.size[2]).toBeCloseTo(6.5, 10);
			expect(Math.abs(c.position[2])).toBeCloseTo(7.25, 10);
		}
	});

	it('fills the gap with the glass the metal would have covered', () => {
		const glass = runs.filter((r) => r.kind === 'glass');
		expect(glass.map((g) => g.id).sort()).toEqual([
			'ridge-glass-left',
			'ridge-glass-right',
		]);

		// A skylight is a length of the cap that happens to be glass: same
		// plane, same fold down each slope, same width of the ridge covered.
		// The cap this roof gets with no skylight is the independent statement
		// of where that is, and it is pinned by hand above.
		const metal = roofRidgeCap(3, 0.5, LENGTH, WALL_HEIGHT, { overhang: 0.5 });
		for (const side of ['left', 'right']) {
			const g = glass.find((r) => r.id === `ridge-glass-${side}`);
			const m = metal.find((r) => r.id === `ridge-cap-${side}`);
			expect(g.position[0]).toBeCloseTo(m.position[0], 10);
			expect(g.position[1]).toBeCloseTo(m.position[1], 10);
			expect(g.position[2]).toBeCloseTo(0, 10);
			expect(g.rotation).toEqual(m.rotation);
			expect(g.size[0]).toBeCloseTo(m.size[0], 10);
			expect(g.size[1]).toBeCloseTo(m.size[1], 10);
			expect(g.size[2]).toBeCloseTo(RUN, 10);
		}
	});
});

describe('roofRidgeCap with more skylight than ridge', () => {
	// 30 ft of skylight asked for on the same 20 ft shed. Including the 6 in
	// overhang at each end there are only 21 ft of ridge to give, so the glass
	// takes all of it and there is no metal cap left to render.
	const runs = roofRidgeCap(3, 0.5, LENGTH, WALL_HEIGHT, {
		overhang: 0.5,
		skylightFt: 30,
	});

	it('gives the whole ridge to the glass and says what it could not fit', () => {
		expect(runs.filter((r) => r.kind === 'cap')).toHaveLength(0);

		const glass = runs.filter((r) => r.kind === 'glass');
		expect(glass).toHaveLength(2);
		for (const g of glass) {
			expect(g.size[2]).toBeCloseTo(LENGTH + 1, 10);
			expect(g.clampedFrom).toBe(30);
		}
	});

	it('says nothing when the run fits', () => {
		const fits = roofRidgeCap(3, 0.5, LENGTH, WALL_HEIGHT, {
			overhang: 0.5,
			skylightFt: 8,
		});
		for (const r of fits) expect(r.clampedFrom).toBeUndefined();
	});
});

describe('rakeJChannel', () => {
	// The same 6:12 gable's top line: tip (-6.5, -0.25), ridge (0, 3), tip.
	const TOPLINE = [
		[-6.5, -0.25],
		[0, 3],
		[6.5, -0.25],
	];
	const OVERHANG = 0.5;

	const lips = rakeJChannel(TOPLINE, LENGTH, WALL_HEIGHT, { overhang: OVERHANG });
	const by = (id) => lips.find((l) => l.id === id);

	it('caps each end with one mitred band', () => {
		expect(lips.map((l) => l.id)).toEqual(['j-channel-front', 'j-channel-back']);
		expect(edgesOf(by('j-channel-front').outline, 3).top).toHaveLength(3);
	});

	it('sits proud of the fly it laps: slab end, the fly stock, then this', () => {
		expect(by('j-channel-front').position[2]).toBeCloseTo(
			halfL + OVERHANG + TRIM_THICKNESS,
			10
		);
		expect(by('j-channel-back').position[2]).toBeLessThan(-(halfL + OVERHANG));
	});

	it('laps its own lap over the panel edge, so the silhouette stays metal', () => {
		// The channel is bent over the panel: its top edge stands J_CHANNEL_LAP
		// ABOVE the surface and its face covers the reveal down to the painted
		// trim. Perpendicular distance to the front-right run, signed so that
		// above the surface comes out negative.
		const { top, bottom } = edgesOf(by('j-channel-front').outline, 3);
		const perpTo = (p) => belowLine(TOPLINE[1], TOPLINE[2], p);

		expect(perpTo(top[2])).toBeCloseTo(-J_CHANNEL_LAP, 10);
		expect(perpTo(bottom[2])).toBeCloseTo(J_CHANNEL_FACE - J_CHANNEL_LAP, 10);
		expect(perpTo(bottom[2])).toBeCloseTo(RAKE_REVEAL, 10);
	});

	it('mitres at the apex instead of butting two square ends there', () => {
		const { top, bottom } = edgesOf(by('j-channel-front').outline, 3);
		expect(top[1][0]).toBeCloseTo(0, 10);
		expect(bottom[1][0]).toBeCloseTo(0, 10);
		// The lap puts the top edge above the ridge, and the face below it.
		expect(top[1][1]).toBeGreaterThan(3);
		expect(bottom[1][1]).toBeLessThan(3);
	});
});
