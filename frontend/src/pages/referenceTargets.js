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

const GREEN = '#2B5219';
const WHITE = '#FFFFFF';
const GALVANIZED = '#B8BCB4';

// Measured off the photograph, not taken from the catalog. The catalog would
// call this building a 12x20x10 — 10ft to the peak — but nothing in the app
// derives a wall from a peak yet (issue #29), so the wall is stated directly.
const BARN_WALL_HEIGHT = 85 / 12; // 85in, floor to eave

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

export const REFERENCE_TARGETS = [
	{
		id: 'barn-barndoors',
		model: 'Barn',
		photo: '/ref_barn_barndoors.jpg',
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
];
