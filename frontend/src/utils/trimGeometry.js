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
	// Centre of the slab's edge: halfway along the rake, half a slab down.
	const rakeY = wallHeight + (roofHeight - tipDrop) / 2 - roofThickness / 2;
	const rakeZ = outerZ + trimThickness / 2;

	const rakes = [
		['front-left', -rakeRun / 2, +rakeZ, +rakeAngle],
		['front-right', +rakeRun / 2, +rakeZ, -rakeAngle],
		['back-left', -rakeRun / 2, -rakeZ, +rakeAngle],
		['back-right', +rakeRun / 2, -rakeZ, -rakeAngle],
	].map(([id, x, z, rotZ]) => ({
		id: `rake-${id}`,
		position: [x, rakeY, z],
		size: [rakeLength, roofThickness, trimThickness],
		rotation: [0, 0, rotZ],
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
 * The white band that follows a Barn's gambrel rake.
 *
 * Not a trim board. A Barn gets no wood rake — the roof panel runs 2 in past
 * the gable end and finishes in J-channel, and what the photographs show along
 * that edge is the channel and the panel's own colour-matched rake flashing.
 * It reads as the widest white line on the building, so leaving it out left the
 * gambrel with no edge at all.
 *
 * One band per straight run of the outline: four per end, eight in all. Each is
 * a box laid along its run, standing just outside the roof slab's rake face.
 *
 * @param outline gambrel points from `gambrelEndOutline`, eave to eave over the
 *   ridge, in wall-relative coordinates where y = 0 is the eave
 */
export function barnRakeFlashing(outline, shedLength, wallHeight, {
	overhang,
	faceWidth = TRIM_WIDTH,
	thickness = TRIM_THICKNESS,
} = {}) {
	// The outline arrives eave, eave, knuckle, ridge, knuckle — the order a
	// filled shape wants. Walk it as a rake instead: left eave up and over.
	const [leftEave, rightEave, rightKnuckle, ridge, leftKnuckle] = outline;
	const runs = [
		['left-lower', leftEave, leftKnuckle],
		['left-upper', leftKnuckle, ridge],
		['right-upper', ridge, rightKnuckle],
		['right-lower', rightKnuckle, rightEave],
	];

	const halfL = shedLength / 2;
	const z = halfL + overhang + thickness / 2;

	return ['front', 'back'].flatMap((side) =>
		runs.map(([id, [x1, y1], [x2, y2]]) => {
			const dx = x2 - x1;
			const dy = y2 - y1;
			return {
				id: `rake-${side}-${id}`,
				position: [
					(x1 + x2) / 2,
					wallHeight + (y1 + y2) / 2,
					side === 'front' ? z : -z,
				],
				size: [Math.hypot(dx, dy), faceWidth, thickness],
				rotation: [0, 0, Math.atan2(dy, dx)],
			};
		})
	);
}
