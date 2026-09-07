/**
 * Standard door and window sizes in feet
 */

export const DOOR_PRESETS = [
  { name: 'Single Door (3ft × 6.8ft)', width: 3, height: 6.8, type: 'door' },
  { name: 'Double Door (4ft × 6.8ft)', width: 4, height: 6.8, type: 'door' },
  { name: 'Wide Door (5ft × 6.8ft)',   width: 5, height: 6.8, type: 'door' },
];

export const WINDOW_PRESETS = [
  { name: 'Small (2ft × 2ft)',          width: 2, height: 2, type: 'window' },
  { name: 'Medium (3ft × 3ft)',         width: 3, height: 3, type: 'window' },
  { name: 'Landscape (4ft × 2ft)',      width: 4, height: 2, type: 'window' },
  { name: 'Portrait (2ft × 4ft)',       width: 2, height: 4, type: 'window' },
  { name: 'Large (4ft × 3ft)',          width: 4, height: 3, type: 'window' },
];

export const GARAGE_DOOR_PRESETS = [
  { name: '6×7 Roll-Up',  width: 6,  height: 7, type: 'garage_door' },
  { name: '8×7 Roll-Up',  width: 8,  height: 7, type: 'garage_door' },
  { name: '9×7 Roll-Up',  width: 9,  height: 7, type: 'garage_door' },
  { name: '10×7 Roll-Up', width: 10, height: 7, type: 'garage_door' },
];

export const SWING_BARN_DOOR_PRESETS = [
  { name: 'Double Swing 6ft', width: 6, height: 6.5, type: 'swing_barn_door' },
  { name: 'Double Swing 8ft', width: 8, height: 6.5, type: 'swing_barn_door' },
  { name: 'Double Swing 10ft', width: 10, height: 6.5, type: 'swing_barn_door' },
];

export const ENTRY_DOOR_PRESETS = [
  { name: '36in Steel Panel',    width: 3, height: 6.8, type: 'door' },
  { name: '36in Nine-Light',     width: 3, height: 6.8, type: 'door' },
];

export const ALL_PRESETS = [
  ...DOOR_PRESETS,
  ...WINDOW_PRESETS,
  ...GARAGE_DOOR_PRESETS,
  ...SWING_BARN_DOOR_PRESETS,
  ...ENTRY_DOOR_PRESETS,
];

/**
 * Group presets by placement type for UI display
 */
export const PRESETS_BY_TYPE = {
  door:            DOOR_PRESETS,
  window:          WINDOW_PRESETS,
  garage_door:     GARAGE_DOOR_PRESETS,
  swing_barn_door: SWING_BARN_DOOR_PRESETS,
  entry_door:      ENTRY_DOOR_PRESETS,
};

/**
 * The Opening types a customer can place, and what each is called.
 *
 * Shared rather than private to the dialog: `PlacementDialog` offers them and
 * `PlacementList` names them back, and a shed that offers "Swing Barn Door" and
 * then lists "Swing_barn_door" has told the customer two different things about
 * one Opening.
 *
 * Not every key in `PRESETS_BY_TYPE` is here. `entry_door` has presets but is
 * not offered, so it is a type that can be loaded from a saved Design and never
 * chosen — which is why the lookup below falls back instead of asserting.
 */
export const PLACEMENT_TYPES = [
	{ value: 'door', label: 'Entry Door' },
	{ value: 'window', label: 'Window' },
	{ value: 'garage_door', label: 'Garage Door' },
	{ value: 'swing_barn_door', label: 'Swing Barn Door' },
];

/**
 * What to call an Opening of this type.
 *
 * Falls back to the raw type with its underscores opened out, so a Design saved
 * with a type this build does not offer still reads as words.
 */
export function placementTypeLabel(type) {
	const known = PLACEMENT_TYPES.find((t) => t.value === type);
	if (known) return known.label;
	return String(type ?? '')
		.split('_')
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(' ');
}
