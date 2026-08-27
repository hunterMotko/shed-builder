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

const GREEN = '#2B5219';
const WHITE = '#FFFFFF';
const GALVANIZED = '#B8BCB4';

const BARN_DOOR_WIDTH = 6;
const BARN_DOOR_HEIGHT = 6.5;

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
//
// Colours are averaged over well-lit patches of the photograph — three separate
// samples of the trim agreed to within two values, so the burgundy really is
// that dark and it is not one shadowed pixel.

const ALMOND = '#EFD7BA';
const BURGUNDY = '#400C0C';
const ROOF_BROWN = '#593C2C';

// Positions are measured off the photograph at 49.3 px/ft, the scale a known
// 12 ft front gives. The door is rounded to the catalog's 36in.
const gableOpenings = [
	{
		id: 'ref-gable-door',
		type: 'door',
		wall: 'front',
		normalizedX: 0.5,
		normalizedY: 6.5 / 2 / GABLE_WALL_HEIGHT,
		width: 3,
		height: 6.5,
	},
	{
		id: 'ref-gable-window-left',
		type: 'window',
		wall: 'front',
		normalizedX: 0.2,
		normalizedY: 0.636,
		width: 2,
		height: 1.6,
	},
	{
		id: 'ref-gable-window-right',
		type: 'window',
		wall: 'front',
		normalizedX: 0.8,
		normalizedY: 0.636,
		width: 2,
		height: 1.6,
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
		designCaption: '12 × 20 ft · 85in walls · #2B5219 · white trim · galvanized metal',
		camera: { position: [22, 12, 24], fov: 45 },
		target: [0, 4, 0],
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
		// Distance is measured to the FRONT WALL, not to the origin: the wall
		// stands at +length/2, so a camera at z=34 on a 16 ft shed is only 26 ft
		// of actual throw and the shed overflows the frame.
		camera: { position: [0, 5.5, 44], fov: 26 },
		target: [0, 5, 0],
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
