/**
 * Wall Rib Geometry Generation
 *
 * Creates T1-11 siding appearance with actual geometry ribs
 * (1/4 inch indentation every 6 inches)
 *
 * Generates rib geometry that can be merged with wall geometry
 * for realistic vertical board appearance.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Create rib geometries for T1-11 vertical siding effect
 *
 * @param {number} wallWidth - Width of wall in feet
 * @param {number} wallHeight - Height of wall in feet
 * @param {number} ribSpacing - Space between ribs in inches (default 6)
 * @param {number} ribDepth - Depth of rib indentation in inches (default 0.25)
 * @returns {array} Array of THREE.BoxGeometry objects representing ribs
 */
export function createWallRibGeometries(wallWidth, wallHeight, ribSpacing = 6, ribDepth = 0.25) {
  // Convert inches to feet
  const spacingFeet = ribSpacing / 12;
  const depthFeet = ribDepth / 12;

  const ribGeometries = [];

  // Calculate number of ribs that fit across the wall width
  const numRibs = Math.ceil(wallWidth / spacingFeet);

  // Create rib geometries at each spacing
  for (let i = 0; i < numRibs; i++) {
    // X position of this rib (center of rib spacing)
    const ribX = -wallWidth / 2 + (i + 0.5) * spacingFeet;

    // Create a thin box for the rib indentation
    // Width: spacing between ribs (6 inches)
    // Height: full wall height
    // Depth: rib indentation (0.25 inches, converted to feet)
    const ribGeometry = new THREE.BoxGeometry(
      spacingFeet,    // X: width of rib spacing
      wallHeight,     // Y: full wall height
      depthFeet       // Z: depth of indentation
    );

    // Convert to non-indexed geometry to match ExtrudeGeometry format
    const nonIndexedRib = ribGeometry.toNonIndexed();

    // Position the rib at the surface of the wall
    nonIndexedRib.translate(ribX, 0, 0);

    ribGeometries.push(nonIndexedRib);
  }

  return ribGeometries;
}

/**
 * Create merged geometry combining wall surface with rib indentations
 *
 * Use this to create a wall with actual geometric ribs instead of just
 * texture/shader simulation
 *
 * @param {THREE.ExtrudeGeometry} wallGeometry - Base wall ExtrudeGeometry
 * @param {number} wallWidth - Width of wall in feet
 * @param {number} wallHeight - Height of wall in feet
 * @param {number} ribSpacing - Space between ribs in inches (default 6)
 * @param {number} ribDepth - Depth of rib indentation in inches (default 0.25)
 * @returns {THREE.BufferGeometry} Merged geometry with ribs
 */
export function mergeWallWithRibs(wallGeometry, wallWidth, wallHeight, ribSpacing = 6, ribDepth = 0.25) {
  // Get rib geometries
  const ribGeometries = createWallRibGeometries(wallWidth, wallHeight, ribSpacing, ribDepth);

  // Create array for merging: wall + all ribs
  const geometriesToMerge = [wallGeometry];
  geometriesToMerge.push(...ribGeometries);

  // Merge all geometries
  let mergedGeometry;

  try {
    // Use imported mergeGeometries function
    mergedGeometry = mergeGeometries(geometriesToMerge, false);
  } catch (error) {
    console.warn('Could not merge wall with ribs, falling back to original wall:', error);
    return wallGeometry;
  }

  return mergedGeometry;
}

/**
 * Calculate rib parameters for given wall width
 * Returns optimal spacing and depth for realistic appearance
 *
 * @param {number} wallWidth - Width of wall in feet
 * @param {number} targetRibSpacing - Desired spacing between ribs in inches (default 6)
 * @returns {object} { ribSpacing, ribDepth, numRibs, totalIndentation }
 */
export function calculateRibParameters(wallWidth, targetRibSpacing = 6) {
  // Standard T1-11 is 6 inches per board with 1/4 inch groove
  const ribSpacing = targetRibSpacing; // inches
  const ribDepth = 0.25; // inches (standard groove depth)

  // Convert wall width to inches
  const wallWidthInches = wallWidth * 12;

  // Calculate number of ribs
  const numRibs = Math.ceil(wallWidthInches / ribSpacing);

  // Calculate total indentation volume (approximate)
  const totalIndentation = numRibs * ribDepth;

  return {
    ribSpacing,
    ribDepth,
    numRibs,
    totalIndentation,
  };
}

/**
 * Create rib pattern data for debugging/visualization
 * Returns information about each rib position
 *
 * @param {number} wallWidth - Width of wall in feet
 * @param {number} ribSpacing - Space between ribs in inches (default 6)
 * @returns {array} Array of { position, index } for each rib
 */
export function generateRibPattern(wallWidth, ribSpacing = 6) {
  const spacingFeet = ribSpacing / 12;
  const ribs = [];

  const numRibs = Math.ceil(wallWidth / spacingFeet);

  for (let i = 0; i < numRibs; i++) {
    const ribX = -wallWidth / 2 + (i + 0.5) * spacingFeet;
    ribs.push({
      index: i,
      position: ribX,
      spacingInches: ribSpacing,
    });
  }

  return ribs;
}

/**
 * T1-11 siding standard dimensions
 */
export const T1_11_STANDARD = {
  boardSpacing: 6, // inches (width of each board)
  grooveDepth: 0.25, // inches (depth of vertical groove/rib)
  boardThickness: 0.625, // inches (3/4 inch standard plywood)
};

/**
 * Alternative siding dimensions (can be used for variations)
 */
export const SMOOTH_BOARD_STANDARD = {
  boardSpacing: 12, // inches (wider boards)
  grooveDepth: 0, // No grooves (smooth surface)
  boardThickness: 0.625, // inches
};
