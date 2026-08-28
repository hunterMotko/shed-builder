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
 * How much metal shows above a rake board or rake band, in feet, measured
 * perpendicular to the slope — the sliver of panel edge and J-channel the
 * photographs show as a line over the trim. Nothing painted may rise past it.
 */
export const RAKE_REVEAL = 0.05;

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

	// Rake: ridge to eave tip, along the slope, on the outside of the gable end.
	const rakeRun = outerX;
	const rakeRise = roofHeight + tipDrop;
	const rakeLength = Math.hypot(rakeRun, rakeRise);
	const rakeAngle = Math.atan2(rakeRise, rakeRun);
	const rakeZ = outerZ + trimThickness / 2;

	// The board hangs PERPENDICULAR to the slope, its top edge RAKE_REVEAL
	// below the top surface so the metal edge shows as a line above it. It
	// used to sit half a slab down PLUMB, which is not the same thing on a
	// rotated board: the plumb-cut slab is thinner perpendicular than the
	// board is, and the board's top corner rose through the metal — a trim
	// sliver visible on the roof plane along every rake.
	const perp = [rakeRise / rakeLength, -rakeRun / rakeLength]; // below the slope
	const drop = RAKE_REVEAL + roofThickness / 2;
	const rakeMidY = wallHeight + (roofHeight - tipDrop) / 2;

	const rakes = [
		['front-left', -1, +rakeZ],
		['front-right', +1, +rakeZ],
		['back-left', -1, -rakeZ],
		['back-right', +1, -rakeZ],
	].map(([id, sx, z]) => ({
		id: `rake-${id}`,
		// perp is worked out on the left slope; mirroring x mirrors it too, and
		// the rotation flips with it — the left rake rises, the right one falls.
		position: [sx * (rakeRun / 2 - perp[0] * drop), rakeMidY + perp[1] * drop, z],
		size: [rakeLength, roofThickness, trimThickness],
		rotation: [0, 0, -sx * rakeAngle],
	}));

	// Eave: level, the full length of the slab, so it meets both rake ends.
	const eaveY = wallHeight - tipDrop - roofThickness / 2;
	const eaves = [-1, +1].map((sx) => ({
		id: sx < 0 ? 'eave-left' : 'eave-right',
		position: [sx * (outerX + trimThickness / 2), eaveY, 0],
		size: [trimThickness, roofThickness, shedLength + 2 * overhang],
		rotation: [0, 0, 0],
	}));

	return [...rakes, ...eaves];
}

/**
 * The white band that follows a Barn's gambrel rake — the fly, not a board.
 *
 * A Barn gets no wood rake. The white run the photographs show is the fly
 * board and the J-channel the panel edge insets into, so it hugs the very
 * edge of the roof: laid against the slab's end cap, its top edge RAKE_REVEAL
 * perpendicular below the top surface, so the metal reads as a thin line
 * above the white and never the other way round.
 *
 * It has been wrong both ways. Centred ON the top line it lapped white over
 * the metal edge; hung from the slab's plumb underside it slid sideways off
 * the steep lower slope — a plumb drop on a near-vertical surface is almost a
 * horizontal one, and the band ended up floating inboard of the panel where
 * it poked out of the roof's silhouette.
 *
 * @param topLine slab top surface from `gambrelRoofTopLine`, eave tip to eave
 *   tip over both Knuckles, in wall-relative coordinates
 */
export function barnRakeFlashing(topLine, shedLength, wallHeight, {
	overhang,
	reveal = RAKE_REVEAL,
	faceWidth = TRIM_WIDTH,
	thickness = TRIM_THICKNESS,
} = {}) {
	const names = ['left-lower', 'left-upper', 'right-upper', 'right-lower'];
	const runs = topLine.slice(0, -1).map((p, i) => [names[i], p, topLine[i + 1]]);

	const halfL = shedLength / 2;
	// Against the slab's end cap face, which the slab carries `overhang` past
	// the end siding.
	const z = halfL + overhang + thickness / 2;

	return ['front', 'back'].flatMap((side) =>
		runs.map(([id, [x1, y1], [x2, y2]]) => {
			const dx = x2 - x1;
			const dy = y2 - y1;
			const len = Math.hypot(dx, dy);
			// Perpendicular below the run — the top line is walked left to
			// right, so this is always [+dy, -dx] normalised.
			const px = dy / len;
			const py = -dx / len;
			const drop = reveal + faceWidth / 2;
			return {
				id: `rake-${side}-${id}`,
				position: [
					(x1 + x2) / 2 + px * drop,
					wallHeight + (y1 + y2) / 2 + py * drop,
					side === 'front' ? z : -z,
				],
				size: [len, faceWidth, thickness],
				rotation: [0, 0, Math.atan2(dy, dx)],
			};
		})
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
	// Same datum as the eave fascia: centred on the slab's edge at the tip.
	const y = wallHeight - tipDrop - roofThickness / 2;

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
 * The gable-end edge of every panel slides into a channel; what shows on the
 * building is its face — a thin metal line capping the rake, sitting just
 * proud of the slab's end cut. Its top edge lies ON the top surface, so the
 * roof's end silhouette stays metal, and the fascia board or rake band below
 * it starts RAKE_REVEAL down, which is what leaves the channel visible as a
 * line. Roof metal, not trim — render it in the roof colour.
 *
 * @param topLine slab top surface from `gableRoofTopLine` or
 *   `gambrelRoofTopLine`, eave tip to eave tip, wall-relative
 */
export function rakeJChannel(topLine, shedLength, wallHeight, {
	overhang,
	faceWidth = 0.06,
	thickness = 0.08,
} = {}) {
	const runs = topLine.slice(0, -1).map((p, i) => [i, p, topLine[i + 1]]);
	const halfL = shedLength / 2;
	const z = halfL + overhang + thickness / 2;

	return ['front', 'back'].flatMap((side) =>
		runs.map(([i, [x1, y1], [x2, y2]]) => {
			const dx = x2 - x1;
			const dy = y2 - y1;
			const len = Math.hypot(dx, dy);
			const px = dy / len;
			const py = -dx / len;
			return {
				id: `j-channel-${side}-${i}`,
				position: [
					(x1 + x2) / 2 + px * (faceWidth / 2),
					wallHeight + (y1 + y2) / 2 + py * (faceWidth / 2),
					side === 'front' ? z : -z,
				],
				size: [len, faceWidth, thickness],
				rotation: [0, 0, Math.atan2(dy, dx)],
			};
		})
	);
}
