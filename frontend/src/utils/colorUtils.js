/**
 * Color manipulation utilities for shed trim and styling
 */

/**
 * Convert hex color to RGB
 * @param {string} hex - Hex color code (e.g., '#FF0000')
 * @returns {{r: number, g: number, b: number}} RGB values 0-255
 */
export function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : { r: 0, g: 0, b: 0 };
}

/**
 * Convert RGB to hex color
 * @param {number} r - Red 0-255
 * @param {number} g - Green 0-255
 * @param {number} b - Blue 0-255
 * @returns {string} Hex color code
 */
export function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map((x) => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('').toUpperCase();
}

/**
 * Lighten a color by a percentage
 * @param {string} hex - Hex color to lighten
 * @param {number} percent - Percentage to lighten (0-100)
 * @returns {string} Lightened hex color
 */
export function lightenColor(hex, percent) {
  const { r, g, b } = hexToRgb(hex);
  const amount = Math.round((255 * percent) / 100);

  return rgbToHex(
    Math.min(255, r + amount),
    Math.min(255, g + amount),
    Math.min(255, b + amount)
  );
}

/**
 * Darken a color by a percentage
 * @param {string} hex - Hex color to darken
 * @param {number} percent - Percentage to darken (0-100)
 * @returns {string} Darkened hex color
 */
export function darkenColor(hex, percent) {
  const { r, g, b } = hexToRgb(hex);
  const amount = Math.round((255 * percent) / 100);

  return rgbToHex(
    Math.max(0, r - amount),
    Math.max(0, g - amount),
    Math.max(0, b - amount)
  );
}

/**
 * Calculate automatic trim color based on mode
 * @param {string} wallColor - Hex color of shed walls
 * @param {string} roofColor - Hex color of shed roof
 * @param {string} autoMode - 'matchRoof' or 'lighterWall'
 * @returns {string} Calculated trim color hex
 */
export function getAutoTrimColor(wallColor, roofColor, autoMode) {
  if (autoMode === 'matchRoof') {
    // Use roof color for trim
    return roofColor;
  } else if (autoMode === 'lighterWall') {
    // Lighten the wall color by 25%
    return lightenColor(wallColor, 25);
  }

  // Default to roof color
  return roofColor;
}

/**
 * Get effective trim color (considering automatic mode)
 * @param {string} trimColor - Manual trim color
 * @param {string} trimColorMode - 'automatic' or 'manual'
 * @param {string} wallColor - Shed wall color
 * @param {string} roofColor - Shed roof color
 * @param {string} trimAutoMode - 'matchRoof' or 'lighterWall'
 * @returns {string} Effective trim color to use
 */
export function getEffectiveTrimColor(
  trimColor,
  trimColorMode,
  wallColor,
  roofColor,
  trimAutoMode
) {
  if (trimColorMode === 'automatic') {
    return getAutoTrimColor(wallColor, roofColor, trimAutoMode);
  }
  return trimColor;
}
