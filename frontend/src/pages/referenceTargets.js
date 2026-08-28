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
		design: {
			width: 12,
			length: 20,
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
		},
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
		design: {
			width: 12,
			length: 16,
			wallHeight: GABLE_WALL_HEIGHT,
			color: ALMOND,
			roofColor: ROOF_BROWN,
			trimColor: BURGUNDY,
			sidingTexture: 'T1-11',
			roofMaterial: 'metal',
			placements: gableOpenings,
			porch: NO_PORCH,
			options: NO_OPTIONS,
		},
	},
];
