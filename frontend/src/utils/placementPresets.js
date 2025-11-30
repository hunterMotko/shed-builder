/**
 * Standard door and window sizes in feet
 */

export const DOOR_PRESETS = [
  {
    name: 'Single Door (3ft × 6.5ft)',
    width: 3,
    height: 6.5,
    type: 'door',
  },
  {
    name: 'Double Door (4ft × 6.5ft)',
    width: 4,
    height: 6.5,
    type: 'door',
  },
  {
    name: 'Tall Door (3ft × 7ft)',
    width: 3,
    height: 7,
    type: 'door',
  },
  {
    name: 'Wide Door (5ft × 6.5ft)',
    width: 5,
    height: 6.5,
    type: 'door',
  },
];

export const WINDOW_PRESETS = [
  {
    name: 'Small Window (2ft × 2ft)',
    width: 2,
    height: 2,
    type: 'window',
  },
  {
    name: 'Medium Window (3ft × 3ft)',
    width: 3,
    height: 3,
    type: 'window',
  },
  {
    name: 'Landscape Window (4ft × 2ft)',
    width: 4,
    height: 2,
    type: 'window',
  },
  {
    name: 'Portrait Window (2ft × 4ft)',
    width: 2,
    height: 4,
    type: 'window',
  },
  {
    name: 'Large Window (4ft × 3ft)',
    width: 4,
    height: 3,
    type: 'window',
  },
];

export const ALL_PRESETS = [...DOOR_PRESETS, ...WINDOW_PRESETS];

/**
 * Group presets by type for UI display
 */
export const PRESETS_BY_TYPE = {
  door: DOOR_PRESETS,
  window: WINDOW_PRESETS,
};
