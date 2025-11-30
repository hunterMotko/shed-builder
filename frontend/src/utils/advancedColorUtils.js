/**
 * Advanced color utilities for realistic trim color calculation
 * Implements visual contrast analysis for professional trim selection
 */

/**
 * Convert hex to RGB
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

/**
 * Convert RGB to hex
 */
function rgbToHex(r, g, b) {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
      .toUpperCase()
  );
}

/**
 * Calculate perceived luminance (brightness) of a color
 * Uses relative luminance formula from WCAG
 * @param {string} hex - Hex color code
 * @returns {number} 0-1, where 0 is darkest, 1 is brightest
 */
export function getColorLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);

  // Convert to 0-1 range
  const [rs, gs, bs] = [r, g, b].map((x) => {
    x = x / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });

  // WCAG relative luminance formula
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Get color saturation (0-1)
 */
export function getColorSaturation(hex) {
  const { r, g, b } = hexToRgb(hex);

  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;

  if (max === min) return 0;

  const l = (max + min) / 2;
  return l < 0.5 ? (max - min) / (max + min) : (max - min) / (2 - max - min);
}

/**
 * Check if a color is "light" or "dark"
 * @param {string} hex - Hex color code
 * @returns {boolean} true if light, false if dark
 */
export function isLightColor(hex) {
  return getColorLuminance(hex) > 0.5;
}

/**
 * Create a contrasting color by adjusting luminance
 * @param {string} hex - Base color
 * @param {number} targetLuminance - Target brightness (0-1)
 * @returns {string} Adjusted hex color
 */
export function adjustLuminance(hex, targetLuminance) {
  const { r, g, b } = hexToRgb(hex);
  const currentLuminance = getColorLuminance(hex);

  if (Math.abs(currentLuminance - targetLuminance) < 0.05) {
    return hex; // Already close enough
  }

  const factor = targetLuminance / (currentLuminance + 0.001);

  // Adjust RGB values while preserving hue
  let nr = Math.round(Math.min(255, r * factor));
  let ng = Math.round(Math.min(255, g * factor));
  let nb = Math.round(Math.min(255, b * factor));

  return rgbToHex(nr, ng, nb);
}

/**
 * Lighten a color
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
 * Darken a color
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
 * Calculate optimal automatic trim color based on visual contrast
 * This function implements professional trim color selection:
 * - If walls are dark, trim should be light
 * - If walls are light, trim should be contrasting (medium or dark)
 * - Trim should always provide visual separation from walls
 *
 * @param {string} wallColor - Siding/wall color (hex)
 * @param {string} roofColor - Roof color (hex)
 * @param {string} autoMode - 'matchRoof' or 'contrast'
 * @returns {string} Calculated trim color (hex)
 */
export function calculateOptimalTrimColor(
  wallColor,
  roofColor,
  autoMode = 'contrast'
) {
  const wallLuminance = getColorLuminance(wallColor);
  const roofLuminance = getColorLuminance(roofColor);

  if (autoMode === 'matchRoof') {
    // Use roof color but ensure contrast with walls
    const targetLuminance = wallLuminance < 0.4 ? 0.85 : wallLuminance > 0.7 ? 0.35 : 0.5;
    return adjustLuminance(roofColor, targetLuminance);
  }

  // 'contrast' mode - maximize visual separation
  if (wallLuminance < 0.35) {
    // Very dark walls → use light trim (near white)
    return adjustLuminance(wallColor, 0.9);
  } else if (wallLuminance < 0.5) {
    // Dark walls → use light trim
    return adjustLuminance(wallColor, 0.8);
  } else if (wallLuminance < 0.65) {
    // Medium walls → use darker or medium contrast
    // Try using roof color if it provides better contrast
    const roofContrast = Math.abs(roofLuminance - wallLuminance);
    const mediumContrast = Math.abs(0.45 - wallLuminance);

    if (roofContrast > mediumContrast * 1.2) {
      return roofColor;
    }
    return adjustLuminance(wallColor, 0.45);
  } else {
    // Light walls → use darker trim for contrast
    return adjustLuminance(wallColor, 0.35);
  }
}

/**
 * Get effective trim color considering all settings
 * @param {string} trimColor - Manual trim color
 * @param {string} trimColorMode - 'automatic' or 'manual'
 * @param {string} wallColor - Siding color
 * @param {string} roofColor - Roof color
 * @param {string} trimAutoMode - Auto calculation mode
 * @returns {string} Final trim color to use
 */
export function getEffectiveTrimColor(
  trimColor,
  trimColorMode,
  wallColor,
  roofColor,
  trimAutoMode
) {
  if (trimColorMode === 'automatic') {
    return calculateOptimalTrimColor(
      wallColor,
      roofColor,
      trimAutoMode || 'contrast'
    );
  }
  return trimColor;
}

/**
 * Suggest a trim color with visual description
 * @param {string} wallColor - Siding color
 * @param {string} roofColor - Roof color
 * @returns {{color: string, description: string}}
 */
export function suggestTrimColor(wallColor, roofColor) {
  const color = calculateOptimalTrimColor(wallColor, roofColor, 'contrast');
  const wallLum = getColorLuminance(wallColor);
  const trimLum = getColorLuminance(color);

  let description = '';
  if (wallLum < 0.4) {
    description = 'Light trim on dark walls - classic contrast';
  } else if (wallLum > 0.65) {
    description = 'Dark trim on light walls - subtle definition';
  } else {
    description = 'Balanced trim color - professional appearance';
  }

  return { color, description };
}
