/**
 * Reference Match targets.
 *
 * Each target pairs a Reference Photo with the Design that should reproduce it.
 * The Design is rendered by the real `BarnShed` / `GableShed`, so fidelity work
 * done here lands in the product rather than in a fork of it (ADR-0012).
 *
 * These are module-level constants on purpose. `placements` identity keys the
 * CSG cut in `ShedWall`, so a fresh array per render would re-cut every opening
 * on every frame.
 */

import { GAMBREL_LOWER_PITCH, GAMBREL_UPPER_PITCH } from '../utils/roofGeometry';
import { wallHeightFt } from '../utils/modelSpec';
import { referencePhoto } from './referencePhotos';

const BARN_WALL_HEIGHT = wallHeightFt('Barn');   // 85in, floor to eave
const GABLE_WALL_HEIGHT = wallHeightFt('Gable'); // 88.5in — the Models differ

// A reference target must not inherit whatever the customer has switched on in
// the Configurator — the shed components fall back to the store for any field a
// Design leaves out, and a stray porch would land in the reconstruction.
const NO_PORCH = { enabled: false, wall: 'front', depth: 6 };

const NO_OPTIONS = {
	garageDoor: { enabled: false, size: '8x7', style: 'rollup' },
	additionalDoor: { enabled: false, size: '6x7' },
	entryDoor: { enabled: false, type: 'steel' },
	vinylWindows: { enabled: false, count: 1, windowSize: '2x2' },
	octagonWindow: { enabled: false },
	skylight: { enabled: false, runningFt: 8 },
	shutters: { enabled: false, pairs: 1 },
	ramp: { enabled: false, size: 'small' },
	octagonVent: { enabled: false },
};

// ── Barn: barn_barndoors.jpg ────────────────────────────────────────────────

// Colours are averaged over flat, well-lit patches of the photograph. A Design
// stores the paint, and a photograph shows the paint under a sky, so these sit
// a little brighter than the pixels they came from.
//
// The green was `#2B5219`, a yellow-green. The photograph's lit side wall
// measures `#284235` — a blue-leaning forest green, 28 values further into the
// blue than what was here. It is the one colour on either target that was
// genuinely wrong rather than merely rendered wrong.
const GREEN = '#2E4C3D';
const WHITE = '#FFFFFF';
// Galvalume, measured `#969B9E` between the ribs. It was `#B8BCB4`, which is
// both lighter and warmer than any patch of that roof.
const GALVANIZED = '#9BA1A4';

// The door opening, measured on the front face. Horizontally it is 220 px of
// the 476 the 12 ft face spans; vertically it is 326 px of the 412 between the
// eave seam and the bottom of the siding. Both come out at about 5.5 ft, and
// the doors do read as square in the photograph.
//
// They were 6 × 6.5 ft, which drew doors that filled the wall from the floor
// nearly to the eave.
const BARN_DOOR_WIDTH = 5.5;
const BARN_DOOR_HEIGHT = 5.6;

const barnDoors = [
	{
		id: 'ref-barn-doors',
		type: 'swing_barn_door',
		wall: 'front',
		normalizedX: 0.5,
		// Sitting on the floor: centre is half a door up the wall.
		normalizedY: BARN_DOOR_HEIGHT / 2 / BARN_WALL_HEIGHT,
		width: BARN_DOOR_WIDTH,
		height: BARN_DOOR_HEIGHT,
	},
];

// ── Gable: 12-16-gable-front.jpg ────────────────────────────────────────────
//
// A square-on elevation, which is why this is the gable target rather than one
// of the three-quarter views: the camera is close enough to square that the two
// roof slopes measure within 0.2 of each other, so proportions can be judged
// rather than guessed.

// The almond and the burgundy were sampled right the first time and are left
// alone: the lit lower wall measures `#F1DAB9` against `#EFD7BA` asked for, and
// four separate patches of trim — both corner boards and both door jambs — come
// back between `#3E0708` and `#420B0B`. They rendered as mud and as near black
// anyway, which was the renderer's fault and not the fixture's.
const ALMOND = '#EFD7BA';
const BURGUNDY = '#400C0C';
// The roof cannot be seen in a square-on elevation, so this one is measured off
// `12-16-gable-frontright.jpg` — the same shed from the corner — where the
// panel reads `#645F4E` in shade and `#918173` with the sky in it.
const ROOF_BROWN = '#6A5D4C';

// Positions are measured off the photograph at 48.5 px/ft — the wall runs 582
// px across a known 12 ft front. Two other things measure exactly to standard
// stock at that scale, which is the check that the scale is right: the window
// frames are 98 px across (24 in) and 142 px tall (36 in).
//
// The windows were 2 × 1.6 ft here. Nothing that shape is sold; the 1.6 was a
// guess made before the frame had been measured, and it rendered a letterbox
// where the photograph has a window half again as tall as it is wide.
// The door opening measures 292 px floor to head — 6.02 ft. It was 6.5, which
// is a catalog size but not this shed's.
const GABLE_DOOR_HEIGHT = 6;

const gableOpenings = [
	{
		id: 'ref-gable-door',
		type: 'door',
		wall: 'front',
		normalizedX: 0.5,
		normalizedY: GABLE_DOOR_HEIGHT / 2 / GABLE_WALL_HEIGHT,
		width: 3,
		height: GABLE_DOOR_HEIGHT,
	},
	{
		id: 'ref-gable-window-left',
		type: 'window',
		wall: 'front',
		normalizedX: 0.191,
		normalizedY: 0.640,
		width: 2,
		height: 3,
	},
	{
		id: 'ref-gable-window-right',
		type: 'window',
		wall: 'front',
		normalizedX: 0.809,
		normalizedY: 0.640,
		width: 2,
		height: 3,
	},
];

// Openings for the Attachment guards. Not measured off anything — see the
// guard-target note below. One window carries shutters and the next explicitly
// does not, which is the point: shutters are a field on the window they flank,
// so a shed must be able to have one of each (issue #44). The garage door
// carries the ramp for the same reason.
const GUARD_DOOR_H = 7;

const gableGuardOpenings = [
	{ id: 'guard-gable-garage', type: 'garage_door', wall: 'front', normalizedX: 0.5,
	  normalizedY: GUARD_DOOR_H / 2 / GABLE_WALL_HEIGHT, width: 8, height: GUARD_DOOR_H,
	  ramp: 'small' },
	{ id: 'guard-gable-window-a', type: 'window', wall: 'left', normalizedX: 0.3,
	  normalizedY: 0.6, width: 2, height: 3, shutters: true },
	{ id: 'guard-gable-window-b', type: 'window', wall: 'left', normalizedX: 0.7,
	  normalizedY: 0.6, width: 2, height: 3, shutters: false },
];

const barnGuardOpenings = [
	{ id: 'guard-barn-garage', type: 'garage_door', wall: 'front', normalizedX: 0.5,
	  normalizedY: GUARD_DOOR_H / 2 / BARN_WALL_HEIGHT, width: 8, height: GUARD_DOOR_H,
	  ramp: 'large' },
	{ id: 'guard-barn-window-a', type: 'window', wall: 'left', normalizedX: 0.3,
	  normalizedY: 0.6, width: 2, height: 3, shutters: true },
	{ id: 'guard-barn-window-b', type: 'window', wall: 'left', normalizedX: 0.7,
	  normalizedY: 0.6, width: 2, height: 3, shutters: false },
];

// The two measured Designs, named so the guard targets below can reuse them
// whole rather than restating a single one of their numbers.
const BARN_BARNDOORS_DESIGN = {
	width: 12,
	length: 20,
	// Read off the shop sheet rather than the photograph: double swing barn
	// doors with a lock are the Standard package, where a Deluxe carries a
	// roll-up and a 36in entry. The grade matters to the picture now — a
	// Deluxe's 2x6 rafters make its roof edge 6in deep against a Standard's 4in.
	tier: 'Standard',
	wallHeight: BARN_WALL_HEIGHT,
	color: GREEN,
	roofColor: GALVANIZED,
	trimColor: WHITE,
	sidingTexture: 'T1-11',
	roofMaterial: 'metal',
	// The build spec, same as every other Barn.
	roofLowerPitch: GAMBREL_LOWER_PITCH,
	roofUpperPitch: GAMBREL_UPPER_PITCH,
	placements: barnDoors,
	porch: NO_PORCH,
	options: NO_OPTIONS,
};

const GABLE_FRONT_DESIGN = {
	width: 12,
	length: 16,
	// A Gable is sold as a Deluxe only, so this is not a choice about this
	// photograph — it is the only grade the shed in it can be. That makes its
	// roof edge 6in rather than 4in, which is the one respect in which this
	// reconstruction was wrong against the photo it was fitted to.
	tier: 'Deluxe',
	wallHeight: GABLE_WALL_HEIGHT,
	color: ALMOND,
	roofColor: ROOF_BROWN,
	trimColor: BURGUNDY,
	sidingTexture: 'T1-11',
	roofMaterial: 'metal',
	placements: gableOpenings,
	porch: NO_PORCH,
	options: NO_OPTIONS,
};

export const REFERENCE_TARGETS = [
	{
		id: 'barn-barndoors',
		model: 'Barn',
		photoFile: 'barn_barndoors.jpg',
		photo: referencePhoto('barn_barndoors.jpg'),
		photoAlt:
			'Reference: dark green barn shed with white double barn doors and a galvanized metal roof',
		photoCaption: 'barn_barndoors.jpg — dark green · white trim · galvanized metal roof',
		designCaption: '12 × 20 ft · 85in walls · #2E4C3D · white trim · galvanized metal',
		// Standing where the photographer stood.
		//
		// Solved rather than guessed. Project the shed's corners for a camera at
		// azimuth θ and distance D, and fit θ and D so two things about the FRONT
		// FACE come out at the numbers the photograph measures: its shape, 476 ×
		// 412 px where 12 ft by 7 would be 1.71 wide and it is 1.16, and its size,
		// 182 px of the 784 the panel is wide. That lands on 23° and 53 ft.
		//
		// Neither of the two obvious shortcuts gets there. Comparing the front face
		// against the receding side wall says 24° but only by accident — a 20 ft
		// wall running away from the camera loses most of its length to
		// perspective, so its average px/ft is not a scale. Reading the
		// foreshortening straight off the front face's aspect says 47°, and that
		// over-swings, because the far corner of the front face is further away
		// too and perspective narrows it beyond the cosine.
		//
		// **The side wall still comes up short.** At 12 × 20 the render shows
		// side/front = 0.50 where the photograph measures 0.64. Letting the length
		// float in the same fit closes it exactly, and asks for **28 ft** — a
		// length this catalog sells. That is a claim about which shed was
		// photographed, not about the camera, so the fixture is left at the 12 × 20
		// it was given and the camera is fitted to the front face, which is the
		// part that does not depend on the length being right.
		//
		// It was [22, 12, 24]: a close, high three-quarter from the other side,
		// which put the long wall on the wrong side of the doors.
		camera: { position: [-21, 7, 48], fov: 46 },
		target: [0, 4.6, 0],
		sky: '#C6CCD1',
		design: BARN_BARNDOORS_DESIGN,
	},
	{
		id: 'gable-front',
		model: 'Gable',
		photoFile: '12-16-gable-front.jpg',
		photo: referencePhoto('12-16-gable-front.jpg'),
		photoAlt:
			'Reference: almond gable shed photographed square on, with burgundy trim, a centre door and two windows',
		photoCaption: '12-16-gable-front.jpg — almond · burgundy trim · brown roof',
		designCaption: '12 × 16 ft · 88.5in walls · #EFD7BA · burgundy trim · 6:12',
		// Near enough to an elevation to compare proportions against the photo.
		//
		// Distance is measured to the FRONT WALL, not to the origin: the wall
		// stands at +length/2, so a camera at z=34 on a 16 ft shed is only 26 ft
		// of actual throw. Set so the 12 ft wall fills 0.45 of the panel, which
		// is the fraction it fills in the photograph — the two sides are then the
		// same size on screen and the eye can do the comparing.
		camera: { position: [0, 5.5, 59], fov: 26 },
		target: [0, 5, 0],
		sky: '#CFD4CB',
		design: GABLE_FRONT_DESIGN,
	},

	// ── Attachment guards ───────────────────────────────────────────────────
	//
	// These are not Reference Photos and never will be: no photograph we have
	// shows a skylight, and none of the numbers below were measured off one.
	// They exist so the pixel suite has a frozen render of each Option's code
	// path, which is what makes "the Options did not disturb the base shed" a
	// test rather than a hope (issue #42 and its siblings).
	//
	// So each reuses a *measured* Design whole and changes only the Option and
	// the camera. Nothing here invents a dimension, a colour or a pitch — the
	// rule that every number in this file carries the measurement that produced
	// it still holds, because these targets contribute no new numbers.
	{
		id: 'gable-roof',
		model: 'Gable',
		photoFile: null,
		photo: null,
		photoAlt: '',
		photoCaption: 'no photograph — this target guards the roof and gable-end Options',
		designCaption: 'gable-front · 8 ft ridge skylight · octagon window both ends',
		// Up and off the ridge, because a skylight is invisible from the
		// near-elevation `gable-front` is framed at. Not a measurement: there is
		// no photograph to match, only a view that shows the part under test.
		// Far enough back to leave sky at the frame's edge: the suite's
		// "draws a building" check samples two patches of sky at the top right
		// and fails if the shed grows into them.
		camera: { position: [20, 18, 32], fov: 34 },
		target: [0, 5, 0],
		sky: '#CFD4CB',
		design: {
			...GABLE_FRONT_DESIGN,
			options: {
				...NO_OPTIONS,
				skylight: { enabled: true, runningFt: 8 },
				octagonWindow: { enabled: true, ends: 'both' },
			},
		},
	},
	{
		id: 'gable-openings',
		model: 'Gable',
		photoFile: null,
		photo: null,
		photoAlt: '',
		photoCaption: 'no photograph — this target guards the wall and attachment Options',
		designCaption: 'gable-front · garage door + ramp · one window shuttered, one not',
		// Front-left three-quarter: the garage door and its ramp are on the
		// front, the windows on the left, and both have to be in frame.
		camera: { position: [-33, 13, 38], fov: 30 },
		// Shifted toward the front wall so the ramp, which stands 4 ft out from
		// it, is wholly in frame — a guard cannot freeze what it crops.
		target: [0, 4, 3],
		sky: '#CFD4CB',
		design: { ...GABLE_FRONT_DESIGN, placements: gableGuardOpenings },
	},
	{
		id: 'barn-openings',
		model: 'Barn',
		photoFile: null,
		photo: null,
		photoAlt: '',
		photoCaption: 'no photograph — this target guards the wall and attachment Options',
		designCaption: 'barn-barndoors · garage door + ramp · one window shuttered, one not',
		camera: { position: [-38, 15, 43], fov: 30 },
		target: [0, 4, 3],
		sky: '#CFD4CB',
		design: { ...BARN_BARNDOORS_DESIGN, placements: barnGuardOpenings },
	},
	{
		id: 'barn-roof',
		model: 'Barn',
		photoFile: null,
		photo: null,
		photoAlt: '',
		photoCaption: 'no photograph — this target guards the roof and gable-end Options',
		designCaption: 'barn-barndoors · 8 ft ridge skylight · octagon vent both ends',
		// The gambrel reaches the ridge cap by a different route to the gable —
		// off its own top line rather than a slope worked from the width — so
		// the two Models need freezing separately.
		camera: { position: [22, 20, 36], fov: 34 },
		target: [0, 5, 0],
		sky: '#CFD4CB',
		design: {
			...BARN_BARNDOORS_DESIGN,
			options: {
				...NO_OPTIONS,
				skylight: { enabled: true, runningFt: 8 },
				octagonVent: { enabled: true, ends: 'both' },
			},
		},
	},
];
