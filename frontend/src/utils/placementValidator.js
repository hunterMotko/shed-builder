/**
 * Validation utilities for door and window placements
 */

/**
 * Validate a placement against wall boundaries
 * @param {Object} placement - Placement object to validate
 * @param {Object} shedDimensions - {width, length, wallHeight}
 * @returns {{valid: boolean, errors: string[], warnings: string[]}}
 */
export function validatePlacement(placement, shedDimensions) {
  const errors = [];
  const warnings = [];

  // Validate required fields
  if (!placement.id || !placement.type || !placement.wall) {
    errors.push('Missing required placement fields');
  }

  // Validate coordinates
  if (placement.normalizedX < 0 || placement.normalizedX > 1) {
    errors.push(`Invalid X coordinate: ${placement.normalizedX}`);
  }
  if (placement.normalizedY < 0 || placement.normalizedY > 1) {
    errors.push(`Invalid Y coordinate: ${placement.normalizedY}`);
  }

  // Validate dimensions
  const MIN_SIZE = 0.5;
  const MAX_SIZE = 12;

  if (placement.width < MIN_SIZE) {
    errors.push(`Width too small: ${placement.width}ft (min: ${MIN_SIZE}ft)`);
  }
  if (placement.width > MAX_SIZE) {
    errors.push(`Width too large: ${placement.width}ft (max: ${MAX_SIZE}ft)`);
  }
  if (placement.height < MIN_SIZE) {
    errors.push(`Height too small: ${placement.height}ft (min: ${MIN_SIZE}ft)`);
  }
  if (placement.height > MAX_SIZE) {
    errors.push(`Height too large: ${placement.height}ft (max: ${MAX_SIZE}ft)`);
  }

  // Get wall dimensions
  const { width, length, wallHeight } = shedDimensions;
  let wallWidth, wallHeight_;

  switch (placement.wall) {
    case 'front':
    case 'back':
      wallWidth = width;
      wallHeight_ = wallHeight;
      break;
    case 'left':
    case 'right':
      wallWidth = length;
      wallHeight_ = wallHeight;
      break;
    default:
      errors.push(`Invalid wall: ${placement.wall}`);
      return { valid: false, errors, warnings };
  }

  // Check if placement fits within wall bounds
  // (allowing slight tolerance for positioning)
  const x1 = placement.normalizedX - placement.width / (2 * wallWidth);
  const x2 = placement.normalizedX + placement.width / (2 * wallWidth);
  const y1 = placement.normalizedY - placement.height / (2 * wallHeight_);
  const y2 = placement.normalizedY + placement.height / (2 * wallHeight_);

  if (x1 < 0 || x2 > 1) {
    warnings.push(`Placement extends beyond wall width (may be partially cut)`);
  }
  if (y1 < 0 || y2 > 1) {
    warnings.push(`Placement extends beyond wall height (may be partially cut)`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Check if two placements overlap
 * @param {Object} placement1 - First placement
 * @param {Object} placement2 - Second placement
 * @param {Object} shedDimensions - Shed dimensions
 * @returns {boolean} True if placements overlap
 */
export function checkOverlap(placement1, placement2, shedDimensions) {
  // Only check if on same wall
  if (placement1.wall !== placement2.wall) {
    return false;
  }

  // Get wall dimensions
  const { width, length, wallHeight } = shedDimensions;
  let wallWidth;

  switch (placement1.wall) {
    case 'front':
    case 'back':
      wallWidth = width;
      break;
    case 'left':
    case 'right':
      wallWidth = length;
      break;
    default:
      return false;
  }

  // Calculate bounds in wall space
  const getElementBounds = (placement) => {
    const halfWidth = placement.width / (2 * wallWidth);
    const halfHeight = placement.height / (2 * wallHeight);

    return {
      xMin: placement.normalizedX - halfWidth,
      xMax: placement.normalizedX + halfWidth,
      yMin: placement.normalizedY - halfHeight,
      yMax: placement.normalizedY + halfHeight,
    };
  };

  const bounds1 = getElementBounds(placement1);
  const bounds2 = getElementBounds(placement2);

  // Add tolerance for overlap detection (0.05 = 5% gap)
  const TOLERANCE = 0.05;

  // Check for overlap with tolerance
  return !(
    bounds1.xMax + TOLERANCE < bounds2.xMin ||
    bounds1.xMin - TOLERANCE > bounds2.xMax ||
    bounds1.yMax + TOLERANCE < bounds2.yMin ||
    bounds1.yMin - TOLERANCE > bounds2.yMax
  );
}

/**
 * Check for overlaps with all existing placements
 * @param {Object} newPlacement - Placement to check
 * @param {Array} existingPlacements - List of existing placements
 * @param {Object} shedDimensions - Shed dimensions
 * @returns {{overlaps: boolean, conflicts: Array}} Overlap info
 */
export function checkPlacementConflicts(newPlacement, existingPlacements, shedDimensions) {
  const conflicts = [];

  for (const existing of existingPlacements) {
    if (checkOverlap(newPlacement, existing, shedDimensions)) {
      conflicts.push({
        conflictId: existing.id,
        conflictType: existing.type,
        conflictWall: existing.wall,
      });
    }
  }

  return {
    overlaps: conflicts.length > 0,
    conflicts,
  };
}
