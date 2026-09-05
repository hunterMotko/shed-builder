import * as kernel from '../kernel';

/**
 * Where the trim boards sit on a shed.
 *
 * The trim counterpart to `openingTransform` (ADR-0011): one place works out
 * the coordinates, so the components cannot drift apart. `BarnTrim` and
 * `GableTrim` render different trim sets — that difference is part of the
 * Model bundle and stays in the components — but a corner board is a corner
 * board on both, and both ask here for it.
 *
 * Everything is in shed space, the same space the walls are placed in: the
 * outer face of the front siding is at `+length / 2`, of the right siding at
 * `+width / 2`, and the floor is y = 0.
 */

/**
 * The face width of a trim board in feet — what you see looking at it.
 *
 * 4in, and now measured rather than assumed. On `12-16-gable-front.jpg`, which
 * is square on and scales at 48.5 px/ft off a known 12 ft front, both corner
 * boards run 15–18 px — 3.7 to 4.5 in. An earlier note here said the photos
 * measured the stock nearer 5.5 in; they do not, and 4 in is what both trim
 * components had always defaulted to anyway.
 */
export const TRIM_WIDTH = 0.333;

/**
 * How thick the stock is in feet — how far a board stands off the siding.
 *
 * 3/4in, a dressed 1x board. Width and thickness used to be the same number,
 * which is what made "proud of the wall" and "as wide as a board" impossible
 * to ask for separately.
 */
export const TRIM_THICKNESS = 0.0625;

/**
 * The metal edge stack along a rake, measured off the Reference Photos.
 *
 * The J-channel's face is what caps every gable-end edge: ~2 in of roof metal
 * (12–13 px at 4.04 px/in on `12-16-gable-front.jpg`, and the same stack in
 * dark on `barn_barndoors.jpg` — dark because it faces down and away from the
 * sky, not because it is a different colour). It laps a little OVER the panel
 * edge, the way the real trim is bent, so the roof's end silhouette is metal.
 * Painted trim starts where the channel face ends: RAKE_REVEAL below the
 * surface, perpendicular to the slope.
 */
export const J_CHANNEL_FACE = 0.18;
export const J_CHANNEL_LAP = 0.03;
export const RAKE_REVEAL = J_CHANNEL_FACE - J_CHANNEL_LAP;

/**
 * The fly: the flat 2x4 under the roof deck at each gable end, painted the
 * trim colour. Its face is the board's edge — 1.5 in, not a 4 in board. On
 * `barn_barndoors.jpg` the white under the metal runs 5–6 px at 3.4 px/in.
 */
export const FLY_FACE = 0.125;

/**
 * How far the eave fascia and the corner boxes hang below the slab's tip
 * corner, in feet.
 *
 * The same distance the rake band hangs below its own slope, measured plumb.
 * `RAKE_REVEAL` is perpendicular to the run, and a perpendicular drop is
 * `hypot(1, slope)` times as far straight down — so on a 6:12 the rake's top
 * edge is 2 in below the roof's edge and an eave fascia that picked its own
 * reveal (it was a flat 0.04) sat an inch and a half above the rake it is
 * supposed to join. They are one board wrapped around the corner; the number
 * cannot be chosen twice. What shows in the gap is the slab's own edge, which
 * is the metal drip the photographs show above the paint on both runs.
 *
 * @param {number} slope rise over run of the slope that reaches this eave
 */
export function eaveFasciaDrop(slope) {
	return RAKE_REVEAL * Math.hypot(1, slope);
}

/**
 * The runs of a surface line, each offset `d` perpendicular into the roof.
 *
 * The line is walked left to right, so u.x is always positive and the offset
 * always heads downward, into the roof rather than off it.
 */
function runsBelow(topLine, d) {
	return topLine.slice(0, -1).map(([x1, y1], i) => {
		const [x2, y2] = topLine[i + 1];
		const len = Math.hypot(x2 - x1, y2 - y1);
		const u = [(x2 - x1) / len, (y2 - y1) / len];
		return { p: [x1 + u[1] * d, y1 - u[0] * d], u };
	});
}

/**
 * Where a run's line crosses a plumb cut. u.x > 0 on every run, so there is
 * always an answer, and the cut is free to fall outside the run it is taken on.
 */
const runAtX = (run, x) => [x, run.p[1] + run.u[1] * ((x - run.p[0]) / run.u[0])];

/**
 * The line a band's lower edge follows, as a function of x.
 *
 * What a corner board has to stop at. The boards at a Barn's gambrel ends run
 * up into the fly, and cut off level they either buried their tops in the roof
 * slab or stood proud of it — a 20:12 slope drops eight inches across the four
 * inches of a corner board, so there is no level that works. Taking the top
 * from the fly's own lower edge gives the board the same angle and lands the
 * two flush.
 *
 * Beyond the ends of the surface line the outermost run carries on, so a board
 * standing a little proud of the roof still gets an answer.
 *
 * @param {number[][]} topLine surface polyline, walked left to right
 * @returns {(x: number) => number} the edge's height, in the line's own frame
 */
export function bandUnderside(topLine, { reveal, faceWidth }) {
	const runs = runsBelow(topLine, reveal + faceWidth);
	return (x) => {
		let i = 0;
		while (i < runs.length - 1 && x > topLine[i + 1][0]) i++;
		return runAtX(runs[i], x)[1];
	};
}

/**
 * A band that follows a roof edge, as one closed outline.
 *
 * Every band along a roof — a rake fascia, the fly under a Barn's metal, the
 * J-channel over either — is one continuous piece that changes direction at
 * the ridge and at each Knuckle. Drawn as a run of boxes it is not one piece:
 * a box is cut square across its own axis, so however carefully the centre
 * lines are mitred the *corners* still overshoot. At the gable apex that left
 * a wedge of daylight above the joint and crossing material below it, and
 * every other break had the same defect in proportion to its angle.
 *
 * An outline has no joints to get wrong. Both edges of the band are offset
 * copies of the surface line and consecutive runs are intersected rather than
 * butted, so each break is mitred by construction. The two ends are cut
 * **plumb**, which is how the slab itself is cut (`slabFrom` drops the top
 * line straight down) and what lets a rake land on an eave fascia.
 *
 * @param {number[][]} topLine surface polyline, walked left to right
 * @param {number} reveal perpendicular distance from the surface down to the
 *   band's top edge; negative laps the band over the surface
 * @param {number} faceWidth the band's face, perpendicular to the run
 * @param {number} endX where the plumb end cuts land, defaulting to the
 *   surface line's own ends. Both roofs are symmetric about the ridge.
 * @param {number} endFloor a level cut across both ends: the band never hangs
 *   below it. A plumb cut alone leaves a point below the band, and the steeper
 *   the run the longer that point — a Barn's 20:12 lower slope hung two and a
 *   half inches of white below the roof it is tucked under. Defaults to no cut.
 * @returns {number[][]} closed outline in the profile plane — the top edge
 *   left to right, the right end, the bottom edge back, then the left end
 */
export function mitredBand(topLine, {
	reveal,
	faceWidth,
	endX = topLine[topLine.length - 1][0],
	endFloor = -Infinity,
}) {
	const meet = (a, b) => {
		const det = a.u[0] * b.u[1] - a.u[1] * b.u[0];
		if (Math.abs(det) < 1e-9) return b.p;
		const t = ((b.p[0] - a.p[0]) * b.u[1] - (b.p[1] - a.p[1]) * b.u[0]) / det;
		return [a.p[0] + a.u[0] * t, a.p[1] + a.u[1] * t];
	};

	const atX = runAtX;
	const atY = (run, y) => [run.p[0] + run.u[0] * ((y - run.p[1]) / run.u[1]), y];

	// One end of the band: down the plumb cut, and then flat along `endFloor`
	// if the plumb cut would have carried the band below it. `corner` is where
	// the two cuts meet, and is null when there is nothing to take off.
	const end = (topRun, botRun, x) => {
		const top = atX(topRun, x);
		const bottom = atX(botRun, x);
		if (!(bottom[1] < endFloor && endFloor < top[1])) return { top, bottom, corner: null };
		return { top, bottom: atY(botRun, endFloor), corner: [x, endFloor] };
	};

	const topRuns = runsBelow(topLine, reveal);
	const botRuns = runsBelow(topLine, reveal + faceWidth);
	const last = topRuns.length - 1;
	const mitres = (runs) => runs.slice(1).map((run, i) => meet(runs[i], run));

	const left = end(topRuns[0], botRuns[0], -endX);
	const right = end(topRuns[last], botRuns[last], endX);

	return [
		left.top,
		...mitres(topRuns),
		right.top,
		...(right.corner ? [right.corner] : []),
		right.bottom,
		...mitres(botRuns).reverse(),
		left.bottom,
		...(left.corner ? [left.corner] : []),
	];
}

/**
 * The corner boards, two per corner.
 *
 * A corner board is nailed **on** the siding, not let into it. Both boards
 * used to be centred on the wall plane, which buried them in the wall with
 * their outer faces exactly coplanar with the siding — nothing decided which
 * surface won, so each board rendered as a strip of hatched noise that changed
 * with the camera (issue #31).
 *
 * The two boards at a corner lap rather than butt: the front or back board
 * runs past the corner to cover the end grain of the side board, which is how
 * the joint is actually built and leaves no notch at the corner.
 *
 * A board is an outline rather than a box because its top is not always level.
 * A Gable's runs floor to eave; a Barn's has to be cut to the gambrel, which
 * drops eight inches across the four inches of a corner board — see `topAt`.
 * The bottom is always flat and always on the floor.
 *
 * @param {number} shedWidth - feet, across the front
 * @param {number} shedLength - feet, front to back
 * @param {number} wallHeight - feet, floor to eave
 * @param {object} [stock]
 * @param {number} [stock.trimWidth] the face you see
 * @param {number} [stock.trimThickness] how far it stands off the siding
 * @param {(x: number) => number} [stock.topAt] the board's top edge at a given
 *   x, in shed space. Level at the eave unless the caller says otherwise; a
 *   Barn passes the underside of its roof, which is as high as a board can go
 *   and leaves nothing showing between it and the fly.
 * @param {number} [stock.floorY] the bottom edge. Flat, and on the floor.
 * @returns {Array<{corner: string, face: string, outline: number[][],
 *   position: number[], depth: number}>} outlines in the XZ-facing plane, to
 *   extrude along Z from `position`
 *
 * NOT yet the kernel's, unlike everything else in this file. `topAt` is a
 * closure and a closure cannot cross the wasm boundary; the kernel replaced it
 * with a named rule (level, or the roof's underside) because those are the only
 * two the app uses. Moving this seam therefore means changing `BarnTrim` to
 * pass the roof's top line instead of a function, which is a change to a caller
 * and not to this body. Left for that step rather than shimmed around.
 */
export function cornerBoards(shedWidth, shedLength, wallHeight, stock = {}) {
	const {
		trimWidth = TRIM_WIDTH,
		trimThickness = TRIM_THICKNESS,
		topAt = () => wallHeight,
		floorY = 0,
	} = stock;

	const halfW = shedWidth / 2;
	const halfL = shedLength / 2;
	const w = trimWidth;
	const t = trimThickness;

	// Bottom flat on the floor, top wherever the roof puts it. Walked as a
	// quad from the inner bottom corner, so the two ends stay opposite edges
	// however the top slopes.
	const board = (inner, outer) => [
		[inner, floorY],
		[outer, floorY],
		[outer, topAt(outer)],
		[inner, topAt(inner)],
	];

	// sx picks the right (+1) or left (-1) wall, sz the front (+1) or back (-1).
	const quadrants = [
		{ corner: 'front-right', sx: +1, sz: +1, face: 'right', endFace: 'front' },
		{ corner: 'front-left', sx: -1, sz: +1, face: 'left', endFace: 'front' },
		{ corner: 'back-right', sx: +1, sz: -1, face: 'right', endFace: 'back' },
		{ corner: 'back-left', sx: -1, sz: -1, face: 'left', endFace: 'back' },
	];

	return quadrants.flatMap(({ corner, sx, sz, face, endFace }) => [
		// On the side wall: thickness out in X, face width running back in Z,
		// stopping where the front or back siding takes over.
		{
			corner,
			face,
			outline: board(sx * halfW, sx * (halfW + t)),
			position: [0, 0, sz > 0 ? halfL - w : -halfL],
			depth: w,
		},
		// On the front or back wall: face width running across X, far enough
		// past the corner to lap the side board's outer face at halfW + t.
		{
			corner,
			face: endFace,
			outline: board(sx * (halfW - w), sx * (halfW + t)),
			position: [0, 0, sz > 0 ? halfL : -(halfL + t)],
			depth: t,
		},
	]);
}

/**
 * The fascia the Gable's roof edge is boxed in with — a rake on each gable
 * end, and an eave down each side.
 *
 * These have to be worked out from the roof, not from the wall, and that is why
 * they moved here. The roof became a slab that runs `overhang` past all four
 * edges (ADR-0013), and `GableTrim` went on nailing its rake boards to the
 * gable end plane — where they were left buried under the roof's own rake
 * projection, invisible. The photographs show the opposite: the rake board is
 * the widest thing on that edge and the roof panel is a line above it.
 *
 * The rake comes back as **one mitred outline per end** rather than two boards
 * (see `mitredBand`). Two boxes could be given the right length and still not
 * meet: cut square across their own axes they left a wedge open above the apex
 * and crossed below it.
 *
 * Rake and eave are the same board turning the corner, so the three numbers
 * that decide where their faces sit are shared rather than chosen twice: both
 * hang `eaveFasciaDrop` below the roof's edge, both are `roofThickness` deep
 * measured **plumb**, and the rake's plumb end lands in the plane the eave
 * board's inner face occupies. The eave then runs a board's thickness past the
 * slab at each end to lap that end — the fascia's counterpart of the lap at a
 * corner board.
 *
 * @param roofHeight rise at the wall, which is what the Peak Height quotes
 * @returns {{rakes: object[], eaves: object[]}} rakes as `{ id, outline,
 *   position, depth }` to extrude, eaves as `{ id, position, size, rotation }`
 */
export function gableFasciaBoards(
	shedWidth,
	shedLength,
	wallHeight,
	roofHeight,
	{ overhang, roofThickness, trimThickness = TRIM_THICKNESS } = {}
) {
	return kernel.gableFascia(
		{ width: shedWidth, length: shedLength, wallHeight },
		roofHeight,
		{ overhang, thickness: roofThickness }
	);
}

/**
 * The fly along a Barn's gambrel rake — a flat 2x4, not a band of trim.
 *
 * A Barn gets no wood rake. What shows painted along the edge is the fly
 * board under the roof deck: 1.5 in of board edge in the trim colour, tucked
 * UNDER the J-channel's metal face, which fills the RAKE_REVEAL above it.
 * It was drawn 4 in wide because the whole white-plus-metal stack was
 * measured as one band; the photographs split it 1.5 in of white under ~2 in
 * of metal.
 *
 * One outline per end, mitred at both Knuckles and the ridge and finished flat
 * at the eave tips. It was four boxes per end, which no length can make meet: a
 * square-cut end poked past the roof's silhouette at every joint.
 *
 * The flat bottom is the whole difference a 20:12 slope makes. A plumb cut on a
 * run that steep leaves a long point below the band, and the fly hung two and a
 * half inches of paint below the roof it is tucked under. It stops where the
 * metal stops: `roofThickness` below the eave tip is the slab's own underside.
 *
 * @param topLine slab top surface from `gambrelRoofTopLine`, eave tip to eave
 *   tip over both Knuckles, in wall-relative coordinates
 */
export function barnRakeFlashing(topLine, shedLength, wallHeight, {
	overhang,
	roofThickness,
	reveal = RAKE_REVEAL,
	faceWidth = FLY_FACE,
	thickness = TRIM_THICKNESS,
} = {}) {
	// The kernel calls these `fly-*`: upstream gives a Barn's fly and a Gable's
	// rake the same `rake-*` string, and it separates them. Translated back here
	// so the names this file has always returned are the names it still returns.
	return kernel
		.barnFly({ width: 0, length: shedLength, wallHeight }, topLine,
			{ overhang, thickness: roofThickness })
		.map((b) => ({ ...b, id: b.id.replace('fly-', 'rake-') }));
}

/**
 * The gambrel break flashing — the metal drip capping each Knuckle.
 *
 * The steep lower panel and the shallow upper one meet at an outside break
 * that neither panel can lap, so the shop runs a bent flashing the full length
 * of the roof over the joint: one leg laid up the upper slope, one hanging
 * down over the lower, meeting at the break. It is roof metal, not trim —
 * render it in the roof colour, from the roof component.
 *
 * @param outline gambrel points from `gambrelEndOutline` (fill order)
 * @returns boxes running the slab's whole depth along Z, centred on the shed
 */
export function barnKnuckleFlashing(outline, shedLength, wallHeight, {
	overhang,
	legWidth = 0.29, // ~3.5 in per bent leg
	thickness = 0.02,
} = {}) {
	return kernel.barnKnuckleFlashing(
		{ width: 0, length: shedLength, wallHeight }, outline, overhang);
}

/**
 * The boxed soffit returns at a Gable's four corners.
 *
 * Where the eave fascia meets the rake, the shop closes the overhang with a
 * box — the corner of the "soffit and fascia box" in the shop spec. Without it
 * the two fascia runs meet around an open corner and the underside of the
 * overhang shows through.
 *
 * The box fills the plan corner between the wall and the slab's edges; the
 * fascia boards already provide the outer faces just past it, so it stops at
 * the slab edge rather than pushing coplanar into them.
 */
export function gableCornerBoxes(shedWidth, shedLength, wallHeight, roofHeight, {
	overhang,
	roofThickness,
} = {}) {
	return kernel.gableCornerBoxes(
		{ width: shedWidth, length: shedLength, wallHeight },
		roofHeight,
		{ overhang, thickness: roofThickness }
	);
}

/**
 * The metal ridge cap — two bent legs meeting over the peak.
 *
 * Both Models get one: a length of roof metal folded over the ridge, capping
 * the joint the two top slopes cannot lap themselves. It runs the slab's
 * whole depth and renders in the roof colour, from the roof component.
 *
 * @param peakY the profile's peak, wall-relative (the ridge rise)
 * @param slope rise/run of the slope EACH SIDE of the ridge — the main pitch
 *   on a Gable, the upper pitch on a Barn
 */
export function roofRidgeCap(peakY, slope, shedLength, wallHeight, {
	overhang,
	legWidth = 0.35, // ~4 in of metal down each side
	thickness = 0.025,
	skylightFt = 0,
} = {}) {
	const cap = kernel.roofRidgeCap(
		{ width: 0, length: shedLength, wallHeight }, peakY, slope, overhang, skylightFt);
	// Upstream carried the over-long-skylight report as a field on whichever
	// glass piece happened to be emitted. The kernel returns it beside the
	// pieces; put it back where the callers look for it.
	return cap.pieces.map((p) => {
		const glass = p.id.startsWith('ridge-glass');
		return {
			...p,
			// Upstream's callers switch on `kind`; the kernel puts it in the id.
			kind: glass ? 'glass' : 'cap',
			...(glass && cap.clampedFrom !== undefined
				? { clampedFrom: cap.clampedFrom }
				: {}),
		};
	});
}

/**
 * The J-channel along the roof's front and back top edges.
 *
 * The gable-end edge of every panel slides into a channel, and its face is
 * the metal cap the photographs show on every edge: J_CHANNEL_FACE of roof
 * metal, lapping J_CHANNEL_LAP over the panel so the roof's end silhouette
 * stays metal, with the painted fly or fascia starting where it ends. It is
 * the proudest thing on the edge — it goes on over the fly. It is one mitred
 * band per end like the fly it covers, so the two stay in register at every
 * break, and the face is deep enough to cover the knuckle flashing's end
 * where that dies into the edge. Roof metal, not trim — render it in the roof
 * colour.
 *
 * @param topLine slab top surface from `gableRoofTopLine` or
 *   `gambrelRoofTopLine`, eave tip to eave tip, wall-relative
 */
export function rakeJChannel(topLine, shedLength, wallHeight, {
	overhang,
	faceWidth = J_CHANNEL_FACE,
	lap = J_CHANNEL_LAP,
	thickness = 0.03,
} = {}) {
	return kernel.rakeJChannel(
		{ width: 0, length: shedLength, wallHeight }, topLine, overhang);
}
