/**
 * Coordinate system utilities for door/window placement
 * Converts between world coordinates and normalized wall coordinates
 */

/**
 * Determine which wall was hit based on intersection point
 * @param {THREE.Vector3} point - Intersection point in world coordinates
 * @param {number} width - Shed width (X axis)
 * @param {number} length - Shed length (Z axis)
 * @returns {'front' | 'back' | 'left' | 'right' | null} The wall name or null if no hit
 */
export function getWallFromIntersection(point, width, length) {
  const halfWidth = width / 2;
  const halfLength = length / 2;
  const threshold = 0.5; // tolerance for edge detection

  // Check if we're on front or back wall (Z axis)
  if (Math.abs(point.z - halfLength) < threshold) {
    return 'front';
  }
  if (Math.abs(point.z + halfLength) < threshold) {
    return 'back';
  }

  // Check if we're on left or right wall (X axis)
  if (Math.abs(point.x + halfWidth) < threshold) {
    return 'left';
  }
  if (Math.abs(point.x - halfWidth) < threshold) {
    return 'right';
  }

  return null;
}

/**
 * Convert world coordinates to normalized coordinates on a wall
 * Normalized coordinates range from 0.0 to 1.0 on both axes
 * @param {THREE.Vector3} point - Intersection point
 * @param {string} wall - Wall identifier ('front', 'back', 'left', 'right')
 * @param {number} width - Shed width
 * @param {number} length - Shed length
 * @param {number} wallHeight - Wall height
 * @returns {{normalizedX: number, normalizedY: number}} Normalized coordinates 0-1
 */
export function getWallNormalizedCoordinates(point, wall, width, length, wallHeight) {
  const halfWidth = width / 2;
  const halfLength = length / 2;

  let normalizedX, normalizedY;

  // Y is always height-based (same for all walls)
  normalizedY = (point.y + wallHeight / 2) / wallHeight;

  // X depends on which wall
  switch (wall) {
    case 'front':
    case 'back':
      // X ranges from -halfWidth to +halfWidth
      normalizedX = (point.x + halfWidth) / width;
      break;

    case 'left':
    case 'right':
      // X ranges along Z axis from -halfLength to +halfLength
      normalizedX = (point.z + halfLength) / length;
      break;

    default:
      normalizedX = 0;
      normalizedY = 0;
  }

  // Clamp to [0, 1] range
  normalizedX = Math.max(0, Math.min(1, normalizedX));
  normalizedY = Math.max(0, Math.min(1, normalizedY));

  return { normalizedX, normalizedY };
}

/**
 * Get the wall dimensions in feet
 * @param {string} wall - Wall identifier
 * @param {number} width - Shed width
 * @param {number} length - Shed length
 * @returns {{wallWidth: number, wallLength: number}} Dimensions of the specified wall
 */
export function getWallDimensions(wall, width, length) {
  switch (wall) {
    case 'front':
    case 'back':
      return { wallWidth: width, wallLength: length };

    case 'left':
    case 'right':
      return { wallWidth: length, wallLength: width };

    default:
      return { wallWidth: 0, wallLength: 0 };
  }
}
