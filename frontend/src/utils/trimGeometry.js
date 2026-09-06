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
 * What a Design is trimmed and flashed with, asked for once.
 *
 * `trimSet` is the wood, in the trim colour. `roofMetal` is the metalwork, in
 * the roof colour. The split is the domain's and not a convenience: CONTEXT.md
 * says the Ridge Cap "is roofing, not trim — drawn in the roof colour by the
 * roof, never by the Trim Set", and the same goes for the J-channel and the
 * Knuckle flashing. A Barn's fly and the channel that laps it sit on the same
 * edge in two different colours, so one list would only have to be taken apart
 * again to paint it.
 *
 * Which pieces a Model carries used to be spelled out in four components —
 * `BarnTrim` and `GableTrim` each listing their own trim, `GambrelRoof` and
 * `GableRoof` each their own metal. That is a fact about the *product*:
 * CONTEXT.md puts the Trim Set in the Model bundle and says "a Barn and a Gable
 * do not carry the same set — that is a difference in the product, not a
 * difference in the renderer." Four listings of one product fact is three too
 * many, and the bill of materials needed a fifth.
 *
 * Everything a Design does not state is derived: the eave overhang from the
 * Model and the width, a Gable's rise from its pitch, a Barn's peak from its
 * own gambrel line. `wallHeight` is the exception and is passed, because the
 * configurator draws a flat 8 ft that nothing has reconciled with the Model's
 * 7.375 — derive it here and a corner board would stand seven inches short of
 * the wall it is nailed to.
 */

/**
 * One Design, in the shape the kernel takes it.
 *
 * @param {string} model `'Barn'` or `'Gable'`
 * @param {Object} [extra] `pitches` for a Barn, `skylightFt` for a ridge
 *   skylight
 */
const designOf = (model, shedWidth, shedLength, wallHeight, extra = {}) => ({
	model,
	width: shedWidth,
	length: shedLength,
	wallHeight,
	...extra,
});

/**
 * Every piece of trim a Design carries: wood, in the trim colour.
 *
 * A Gable's set is eight corner boards cut level, a mitred rake on each end, an
 * eave fascia down each side and a boxed return at each corner. A Barn's is
 * eight corner boards cut to the gambrel's underside and the fly along each
 * rake — and no fascia at all, its roof edge finishing in metal.
 *
 * @returns {{boards: object[], parts: object[]}} `boards` are outlines to
 *   extrude (`<ExtrudedBand>`), `parts` are boxes (`<boxGeometry>`). Every
 *   piece has an `id` distinct across the whole shed, ready to be a key.
 */
export function trimSet(model, shedWidth, shedLength, wallHeight, extra = {}) {
	return kernel.trimSet(designOf(model, shedWidth, shedLength, wallHeight, extra));
}

/**
 * Every piece of metalwork on a Design's roof, in the roof colour.
 *
 * Both Models get a ridge cap and a J-channel down each rake; a Barn also gets
 * break flashing over each Knuckle. A skylight is part of this answer and not a
 * part laid over it — the cap breaks either side of the glass and the glass
 * fills exactly the run the metal gave up, so the two cannot drift (issue #42).
 *
 * @returns {{boards: object[], parts: object[], clampedFrom: number|undefined}}
 *   each part carries `kind`, `'glass'` or `'cap'`, for `ridgeMaterial`.
 *   `clampedFrom` is the skylight length asked for when the ridge was too short
 *   to give it — a fact about the request, not about a piece of metal.
 */
export function roofMetal(model, shedWidth, shedLength, wallHeight, extra = {}) {
	const metal = kernel.roofMetal(designOf(model, shedWidth, shedLength, wallHeight, extra));
	return { ...metal, parts: metal.parts.map(withKind) };
}

/** `'glass'` or `'cap'`, which the kernel says in the id. */
const withKind = (part) => ({
	...part,
	kind: part.id.startsWith('ridge-glass') ? 'glass' : 'cap',
});

/**
 * The two boards that cover each corner, eight in all.
 *
 * A corner board is the same board on both Models; what differs is how its top
 * is cut, and that is `top` — the one thing this function needs to be told.
 *
 * @param {number} shedWidth
 * @param {number} shedLength
 * @param {number} wallHeight
 * @param {Object} [stock]
 * @param {number} [stock.trimWidth] the face width, or the kernel's stock
 * @param {Object} [stock.top] how the top is cut. `{ kind: 'level' }` for a
 *   Gable, floor to eave. `{ kind: 'roof-underside', topLine, roofThickness }`
 *   for a Barn, where the board is cut parallel to the fly on the slab's
 *   underside — as high as it can go, leaving no siding showing between the
 *   board and the fly.
 * @returns {Array<{id: string, outline: number[][], position: number[],
 *   depth: number}>} outlines to extrude along Z from `position`
 *
 * This used to take `topAt` as a callback, and a callback cannot cross the
 * wasm boundary. The two cases are named instead, because those are the only
 * two the app has — and naming them moved the Barn's three-term expression
 * (`wallHeight + bandUnderside(topLine)(x) - ROOF_THICKNESS`) into the kernel,
 * where the rest of that geometry already lives. See the kernel's ADR-0002.
 *
 * Boards are identified by `id` — `corner-front-right-right` — rather than by
 * a `corner`/`face` pair. That is the kernel's naming for every trim piece,
 * not a shape invented here.
 */
export function cornerBoards(shedWidth, shedLength, wallHeight, stock = {}) {
	const { trimWidth, top = { kind: 'level' } } = stock;
	return kernel.cornerBoards({ width: shedWidth, length: shedLength, wallHeight }, top, trimWidth);
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
	// Upstream's callers switch on `kind`; the kernel puts it in the id.
	return cap.pieces.map((p) => {
		const piece = withKind(p);
		return piece.kind === 'glass' && cap.clampedFrom !== undefined
			? { ...piece, clampedFrom: cap.clampedFrom }
			: piece;
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
