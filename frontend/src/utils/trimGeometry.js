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
 * corner. Flush with it their top edges were coplanar with the roof's own
 * edge and sparkled through it; the photographs show the metal overhanging
 * the fascia with a drip lip there anyway.
 */
export const EAVE_REVEAL = 0.04;

/**
 * Offset a rake line's runs and mitre the joints.
 *
 * Each band along a roof edge is a straight box, and a straight box cut
 * square pokes out of the roof's silhouette wherever two runs meet at an
 * angle — at the ridge the two rake boards crossed in an X, and at each
 * Knuckle the bands jutted past the edge line. Offsetting every run's centre
 * line by the same perpendicular distance and intersecting neighbours gives
 * each box the mitre point to end on instead.
 *
 * @param topLine surface polyline, walked left to right
 * @param offset perpendicular distance from the surface down to the centre
 * @returns per run: { mid, len, rot } in the profile plane
 */
function mitredRuns(topLine, offset) {
	const lines = [];
	for (let i = 0; i < topLine.length - 1; i++) {
		const [x1, y1] = topLine[i];
		const [x2, y2] = topLine[i + 1];
		const len = Math.hypot(x2 - x1, y2 - y1);
		const u = [(x2 - x1) / len, (y2 - y1) / len];
		// Perpendicular below the run: the line is walked left to right.
		lines.push({ p: [x1 + (u[1] * offset), y1 - u[0] * offset], u, len });
	}

	const meet = (a, b) => {
		const det = a.u[0] * b.u[1] - a.u[1] * b.u[0];
		if (Math.abs(det) < 1e-9) return b.p;
		const t = ((b.p[0] - a.p[0]) * b.u[1] - (b.p[1] - a.p[1]) * b.u[0]) / det;
		return [a.p[0] + a.u[0] * t, a.p[1] + a.u[1] * t];
	};

	return lines.map((line, i) => {
		const from = i === 0 ? line.p : meet(lines[i - 1], line);
		const to =
			i === lines.length - 1
				? [line.p[0] + line.u[0] * line.len, line.p[1] + line.u[1] * line.len]
				: meet(line, lines[i + 1]);
		return {
			mid: [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2],
			len: Math.hypot(to[0] - from[0], to[1] - from[1]),
			rot: Math.atan2(line.u[1], line.u[0]),
		};
	});
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
 * @param {number} shedWidth - feet, across the front
 * @param {number} shedLength - feet, front to back
 * @param {number} wallHeight - feet, floor to eave
 * @param {{trimWidth?: number, trimThickness?: number}} [stock]
 * @returns {Array<{corner: string, face: string, position: number[], size: number[]}>}
 */
export function cornerBoards(shedWidth, shedLength, wallHeight, stock = {}) {
	const { trimWidth = TRIM_WIDTH, trimThickness = TRIM_THICKNESS } = stock;

	const halfW = shedWidth / 2;
	const halfL = shedLength / 2;
	const w = trimWidth;
	const t = trimThickness;
	const y = wallHeight / 2;

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
			position: [sx * (halfW + t / 2), y, sz * (halfL - w / 2)],
			size: [t, wallHeight, w],
		},
		// On the front or back wall: face width running across X, far enough
		// past the corner to lap the side board's outer face at halfW + t.
		{
			corner,
			face: endFace,
			position: [sx * (halfW + (t - w) / 2), y, sz * (halfL + t / 2)],
			size: [w + t, wallHeight, t],
		},
	]);
}

/**
 * The fascia the Gable's roof edge is boxed in with — two rakes and two eaves.
 *
 * These have to be worked out from the roof, not from the wall, and that is why
 * they moved here. The roof became a slab that runs `overhang` past all four
 * edges (ADR-0013), and `GableTrim` went on nailing its rake boards to the
 * gable end plane — where they were left buried under the roof's own rake
 * projection, invisible. The photographs show the opposite: the rake board is
 * the widest thing on that edge and the roof panel is a line above it.
 *
 * A board covers the slab's cut edge, so it is `roofThickness` on the face and
 * `TRIM_THICKNESS` deep, and it stands just outside the surface it covers.
 *
 * @param roofHeight rise at the wall, which is what the Peak Height quotes
 * @returns boards as `{ id, position, size, rotation }`, ready for a mesh
 */
export function gableFasciaBoards(
	shedWidth,
	shedLength,
	wallHeight,
	roofHeight,
	{ overhang, roofThickness, trimThickness = TRIM_THICKNESS } = {}
) {
	const halfW = shedWidth / 2;
	const halfL = shedLength / 2;
	const slope = roofHeight / halfW;

	// Where the slab actually ends. `y = 0` in the roof profile is the eave at
	// the wall, so the overhang tip hangs BELOW the top plate by its own run.
	const outerX = halfW + overhang;
	const outerZ = halfL + overhang;
	const tipDrop = overhang * slope;

	// Rake: ridge to eave tip, along the slope, on the outside of the gable
	// end. The two boards are mitred at the apex — cut square they crossed in
	// an X and each poked past the opposing slope's silhouette — and the whole
	// board hangs RAKE_REVEAL below the surface, the reveal the J-channel's
	// metal face fills. Perpendicular, not plumb: a plumb-cut slab is thinner
	// perpendicular than the board, and hanging the board a plumb half-slab
	// down rose its top corner through the roof plane.
	const rakeZ = outerZ + trimThickness / 2;
	const rakeTop = [
		[-outerX, -tipDrop],
		[0, roofHeight],
		[outerX, -tipDrop],
	];
	const rakeRuns = mitredRuns(rakeTop, RAKE_REVEAL + roofThickness / 2);

	const rakes = [
		['front-left', 0, +rakeZ],
		['front-right', 1, +rakeZ],
		['back-left', 0, -rakeZ],
		['back-right', 1, -rakeZ],
	].map(([id, run, z]) => ({
		id: `rake-${id}`,
		position: [rakeRuns[run].mid[0], wallHeight + rakeRuns[run].mid[1], z],
		size: [rakeRuns[run].len, roofThickness, trimThickness],
		rotation: [0, 0, rakeRuns[run].rot],
	}));

	// Eave: level, the full length of the slab, so it meets both rake ends.
	// Dropped a small reveal below the slab's tip corner — flush with it the
	// two coplanar edges fought for the same pixels, and the photographs show
	// the metal overhanging the fascia with a drip anyway.
	const eaveY = wallHeight - tipDrop - EAVE_REVEAL - roofThickness / 2;
	const eaves = [-1, +1].map((sx) => ({
		id: sx < 0 ? 'eave-left' : 'eave-right',
		position: [sx * (outerX + trimThickness / 2), eaveY, 0],
		size: [trimThickness, roofThickness, shedLength + 2 * overhang],
		rotation: [0, 0, 0],
	}));

		return [...rakes, ...eaves];
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
 * The runs are mitred at the Knuckles and the ridge — cut square they jutted
 * past the roof's silhouette at every joint.
 *
 * @param topLine slab top surface from `gambrelRoofTopLine`, eave tip to eave
 *   tip over both Knuckles, in wall-relative coordinates
 */
export function barnRakeFlashing(topLine, shedLength, wallHeight, {
	overhang,
	reveal = RAKE_REVEAL,
	faceWidth = FLY_FACE,
	thickness = TRIM_THICKNESS,
} = {}) {
	const names = ['left-lower', 'left-upper', 'right-upper', 'right-lower'];
	const runs = mitredRuns(topLine, reveal + faceWidth / 2);

	const halfL = shedLength / 2;
	// Against the slab's end cap face, which the slab carries `overhang` past
	// the end siding. The J-channel sits just proud of this, lapping it.
	const z = halfL + overhang + thickness / 2;

	return ['front', 'back'].flatMap((side) =>
		runs.map(({ mid, len, rot }, i) => ({
			id: `rake-${side}-${names[i]}`,
			position: [mid[0], wallHeight + mid[1], side === 'front' ? z : -z],
			size: [len, faceWidth, thickness],
			rotation: [0, 0, rot],
		}))
	);
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
	const [leftEave, rightEave, rightKnuckle, ridge, leftKnuckle] = outline;
	const depth = shedLength + 2 * overhang;
	// Just off the panel surface, so the drip edge reads without flickering.
	const lift = 0.008;

	const sides = [
		['right', rightKnuckle, ridge, rightEave],
		['left', leftKnuckle, ridge, leftEave],
	];

	return sides.flatMap(([side, knuckle, ridgePt, eavePt]) =>
		[
			['upper', ridgePt],
			['lower', eavePt],
		].map(([leg, toward]) => {
			const dx = toward[0] - knuckle[0];
			const dy = toward[1] - knuckle[1];
			const len = Math.hypot(dx, dy);
			const ux = dx / len;
			const uy = dy / len;
			// Perpendicular pointing off the roof surface, away from the shed.
			let px = -uy;
			let py = ux;
			if (py < 0) {
				px = -px;
				py = -py;
			}
			return {
				id: `knuckle-${side}-${leg}`,
				position: [
					knuckle[0] + ux * (legWidth / 2) + px * (thickness / 2 + lift),
					wallHeight + knuckle[1] + uy * (legWidth / 2) + py * (thickness / 2 + lift),
					0,
				],
				size: [legWidth, thickness, depth],
				rotation: [0, 0, Math.atan2(dy, dx)],
			};
		})
	);
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
	const halfW = shedWidth / 2;
	const halfL = shedLength / 2;
	const slope = roofHeight / halfW;
	const tipDrop = overhang * slope;
	// Same datum as the eave fascia: the slab's edge at the tip, dropped the
	// same EAVE_REVEAL so the two never rise past the metal.
	const y = wallHeight - tipDrop - EAVE_REVEAL - roofThickness / 2;

	return [
		['front-right', +1, +1],
		['front-left', -1, +1],
		['back-right', +1, -1],
		['back-left', -1, -1],
	].map(([id, sx, sz]) => ({
		id: `corner-box-${id}`,
		position: [sx * (halfW + overhang / 2), y, sz * (halfL + overhang / 2)],
		size: [overhang, roofThickness, overhang],
		rotation: [0, 0, 0],
	}));
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
} = {}) {
	const depth = shedLength + 2 * overhang;
	const lift = 0.01; // just off the panel, so the cap reads as its own piece
	const norm = Math.hypot(1, slope);

	return [-1, +1].map((sx) => {
		// Down-slope from the ridge, and the surface normal off that slope.
		const ux = sx / norm;
		const uy = -slope / norm;
		const nx = (sx * slope) / norm;
		const ny = 1 / norm;
		return {
			id: sx < 0 ? 'ridge-cap-left' : 'ridge-cap-right',
			position: [
				ux * (legWidth / 2) + nx * (thickness / 2 + lift),
				wallHeight + peakY + uy * (legWidth / 2) + ny * (thickness / 2 + lift),
				0,
			],
			size: [legWidth, thickness, depth],
			rotation: [0, 0, Math.atan2(uy, ux)],
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
 * the proudest thing on the edge — it goes on over the fly. The runs are
 * mitred like the fly's, and the face is deep enough to cover the knuckle
 * flashing's end where that dies into the edge. Roof metal, not trim —
 * render it in the roof colour.
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
	const runs = mitredRuns(topLine, faceWidth / 2 - lap);
	const halfL = shedLength / 2;
	// Proud of the fly it laps: slab end, then the fly's stock, then this.
	const z = halfL + overhang + TRIM_THICKNESS + thickness / 2;

	return ['front', 'back'].flatMap((side) =>
		runs.map(({ mid, len, rot }, i) => ({
			id: `j-channel-${side}-${i}`,
			position: [mid[0], wallHeight + mid[1], side === 'front' ? z : -z],
			size: [len, faceWidth, thickness],
			rotation: [0, 0, rot],
		}))
	);
}
