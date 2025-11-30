# Placement Reference Point Fix Guide

**Date**: November 29, 2025
**Purpose**: Diagnostic and remediation for door/window placement off-bounds issues
**Status**: Ready for implementation

---

## Quick Diagnosis

### Symptom Checklist

- [ ] Door/window objects not rendering at clicked location
- [ ] Trim frame not visible around doors/windows
- [ ] CSG holes not aligned with visible door/window geometry
- [ ] Placements only visible on certain walls
- [ ] Placements work at center but fail at edges/corners
- [ ] Different behavior when toggling styles (Gable vs Gambrel)

### Most Likely Causes (In Order)

1. **Bounds Checking** - Normalized coords exceeding [0, 1]
2. **Data Not Passed** - Placement object missing width/height
3. **Parent Offset** - Group hierarchy offset not accounted for
4. **CSG Geometry Clone** - Wall geometry not properly cloned before CSG

---

## Defensive Fixes (Safe to Implement)

### Fix 1: Enhance Coordinate Bounds Checking

**File**: `/src/utils/coordinateUtils.js`

**Current Code** (lines 75-77):
```javascript
// Clamp to [0, 1] range
normalizedX = Math.max(0, Math.min(1, normalizedX));
normalizedY = Math.max(0, Math.min(1, normalizedY));
```

**Enhanced Fix**:
```javascript
// Clamp to [0, 1] range with logging
const clampedX = Math.max(0, Math.min(1, normalizedX));
const clampedY = Math.max(0, Math.min(1, normalizedY));

// Log if clamping occurred
if (clampedX !== normalizedX || clampedY !== normalizedY) {
  console.warn(
    'Coordinate clamping applied. Original: (' +
    normalizedX.toFixed(3) + ', ' + normalizedY.toFixed(3) + ') → ' +
    'Clamped: (' + clampedX.toFixed(3) + ', ' + clampedY.toFixed(3) + ')'
  );
}

normalizedX = clampedX;
normalizedY = clampedY;

return { normalizedX, normalizedY };
```

**Benefit**: Identifies edge-clicking issues

---

### Fix 2: Add Placement Validation

**File**: `/src/utils/csgOperations.js`

**Add After Line 98**:
```javascript
/**
 * Validate placement has required properties
 * @param {Object} placement - Placement to validate
 * @returns {boolean} True if valid
 */
validatePlacement(placement) {
  const required = ['normalizedX', 'normalizedY', 'width', 'height', 'wall'];
  for (const prop of required) {
    if (!(prop in placement)) {
      console.error(`Placement missing required property: ${prop}`, placement);
      return false;
    }
  }

  // Validate numeric ranges
  if (placement.normalizedX < 0 || placement.normalizedX > 1) {
    console.warn(`Invalid normalizedX: ${placement.normalizedX}`);
  }
  if (placement.normalizedY < 0 || placement.normalizedY > 1) {
    console.warn(`Invalid normalizedY: ${placement.normalizedY}`);
  }
  if (placement.width <= 0 || placement.height <= 0) {
    console.error('Placement width/height must be positive', placement);
    return false;
  }

  return true;
}
```

**Update `subtractOpening` Method** (line 97):
```javascript
subtractOpening(baseGeometry, placement, shedDimensions) {
  // Add validation
  if (!this.validatePlacement(placement)) {
    console.error('Invalid placement, skipping CSG operation');
    return baseGeometry;
  }

  try {
    // ... rest of method unchanged ...
```

**Benefit**: Catches data integrity issues

---

### Fix 3: Enhanced CSG Error Handling

**File**: `/src/utils/csgOperations.js`

**Update `subtractOpening` Method** (lines 97-118):
```javascript
subtractOpening(baseGeometry, placement, shedDimensions) {
  try {
    // Get world coordinates for the placement
    const worldCoords = this.getWorldCoordinates(placement, shedDimensions);

    // Log coordinates for debugging
    console.debug('CSG subtraction:', {
      placement: {
        normalizedX: placement.normalizedX,
        normalizedY: placement.normalizedY,
        width: placement.width,
        height: placement.height,
        wall: placement.wall,
      },
      worldPosition: {
        x: worldCoords.position.x.toFixed(3),
        y: worldCoords.position.y.toFixed(3),
        z: worldCoords.position.z.toFixed(3),
      },
      boxSize: worldCoords.size,
    });

    // Create subtraction box mesh
    const subtractionMesh = this.createSubtractionBox(worldCoords);

    // Convert geometries to meshes for CSG
    const baseMesh = new THREE.Mesh(baseGeometry.clone());

    // Perform CSG subtraction
    const result = this.evaluator.evaluate(baseMesh, subtractionMesh, SUBTRACTION);

    // Validate result
    if (!result || !result.geometry) {
      console.warn('CSG subtraction returned null/invalid geometry');
      return baseGeometry;
    }

    return result.geometry;
  } catch (error) {
    console.error('Error performing CSG subtraction:', error);
    console.error('  Placement:', placement);
    console.error('  Shed dimensions:', shedDimensions);
    // Return original geometry on error
    return baseGeometry;
  }
}
```

**Benefit**: Detailed debugging output

---

## Coordinate System Verification

### Verify Correct Alignment

**Add Temporary Debug Component**: `/src/components/PlacementDebugger.jsx`

```javascript
import React, { useEffect } from 'react';
import { useShedStore } from '../store/shedStore';

export const PlacementDebugger = () => {
  const placements = useShedStore((state) => state.placements);

  useEffect(() => {
    if (placements.length > 0) {
      console.group('📍 Placement Debug Info');
      placements.forEach((p, i) => {
        console.log(`Placement ${i}:`, {
          id: p.id,
          type: p.type,
          wall: p.wall,
          normalized: { x: p.normalizedX.toFixed(3), y: p.normalizedY.toFixed(3) },
          size: { w: p.width.toFixed(2), h: p.height.toFixed(2) },
        });
      });
      console.groupEnd();
    }
  }, [placements]);

  return null; // Invisible component, just for logging
};
```

**Usage** (in Canvas3D.jsx):
```javascript
import { PlacementDebugger } from './PlacementDebugger';

export const Canvas3D = ({ ... }) => {
  return (
    <Canvas ...>
      <PlacementDebugger />
      {/* ... rest of canvas ... */}
    </Canvas>
  );
};
```

---

## Root Cause Hypothesis Testing

### Test 1: Is Placement Data Correct?

**Expected**: Console logs show normalizedX, normalizedY in [0, 1], width/height > 0

**If Failed**: Check placement creation code in Canvas3D.jsx

---

### Test 2: Do Door/Window Objects Render?

**Expected**: Visible door/window geometry appears at clicked location

**If Failed**: Issue is in DoorObject.jsx or WindowObject.jsx positioning

**Debugging**:
```javascript
// Add to DoorObject.jsx line 77
<group position={position} rotation={rotation}>
  {/* Add visible marker sphere */}
  <mesh position={[0, 0, 0]}>
    <sphereGeometry args={[0.2, 8, 8]} />
    <meshStandardMaterial color={0xFF0000} />
  </mesh>
  {/* ... rest of door geometry ... */}
</group>
```

If red sphere appears at click location: ✅ Visual rendering works
If red sphere doesn't appear: ❌ Group positioning broken

---

### Test 3: Are CSG Holes Aligned?

**Expected**: CSG holes match visible door/window positions

**Debugging**:
```javascript
// In csgOperations.js, createSubtractionBox method
createSubtractionBox(worldCoords) {
  const { position, size } = worldCoords;
  const geometry = new THREE.BoxGeometry(size.width, size.height, size.depth);
  // TEMPORARY: make visible for debugging
  const material = new THREE.MeshStandardMaterial({
    visible: true,  // Changed from false
    color: 0x00FF00,  // Green
    wireframe: true,
    transparent: true,
    opacity: 0.5
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  return mesh;
}
```

If green wireframe boxes appear at door/window locations: ✅ CSG positioning correct
If boxes off-location: ❌ Coordinate transformation broken

---

## Surgical Fixes (If Issues Identified)

### If CSG Boxes Offset from Doors

**Hypothesis**: Wall mesh offset not accounted for

**Fix Approach**:
```javascript
// In csgOperations.js, getWorldCoordinates method
getWorldCoordinates(placement, shedDimensions) {
  // ... existing code ...

  // ADJUSTMENT for wall mesh offset
  // Wall mesh is positioned at [0, -wallHeight/2, 0]
  // So CSG boxes need local-space Y adjustment
  const wallMeshYOffset = -shedDimensions.wallHeight / 2;

  // Instead of:
  // position.y = -wallHeight / 2 + normalizedY * wallHeight

  // Use:
  position.y = (normalizedY - 0.5) * shedDimensions.wallHeight;
  // This centers around Y=0 and avoids the offset issue
```

---

### If Coordinates Out of Bounds

**Issue**: Clicks at wall edges produce invalid normalized coords

**Fix**:
```javascript
// In coordinateUtils.js, getWallNormalizedCoordinates
// Add validation BEFORE clamping:
if (normalizedX < -0.01 || normalizedX > 1.01) {
  console.warn(
    'Suspicious normalizedX value detected:',
    normalizedX,
    'Wall:', wall,
    'Point:', point
  );
}

// Keep clamping as-is
normalizedX = Math.max(0, Math.min(1, normalizedX));
normalizedY = Math.max(0, Math.min(1, normalizedY));
```

---

## Testing Procedure

### Step 1: Enable Debug Mode

```javascript
// At top of ShedUltraRefined.jsx
const DEBUG_PLACEMENT = true;  // Set to true

// When rendering placements:
{placements.map((placement) => {
  if (DEBUG_PLACEMENT) {
    console.log('Rendering placement:', placement);
  }
  // ... render logic ...
})}
```

### Step 2: Test Simple Scenario

1. Load configurator with Gable style (simpler roof)
2. Click at center of front wall (normalized [0.5, 0.5])
3. Expected: Door visible at click location
4. Check console for coordinate values

### Step 3: Test Edge Cases

1. Click near wall corners
2. Click at top edge, bottom edge
3. Click on different walls
4. Verify bounds checking logs appear

### Step 4: Validate CSG

1. Add visible CSG boxes (green wireframe)
2. Verify boxes appear at door/window locations
3. Check if CSG holes actually cut geometry

---

## Production Fix Deployment

### Safe Implementation Path

1. **Add validation functions** (Fix 1-2) - No breaking changes
2. **Enhanced error handling** (Fix 3) - Improves robustness
3. **Test with debugging tools** - Identify exact issue
4. **Apply surgical fix** - Target root cause
5. **Remove debug logging** - Clean up for production

### Rollback Plan

- Keep original csgOperations.js in version control
- Test changes on staging branch first
- All fixes are backward compatible

---

## Success Criteria

**When Fixed**:
- ✅ Door/window objects render at click locations
- ✅ Door/window trim frames visible
- ✅ CSG holes align with visible geometry
- ✅ Works on all four walls
- ✅ Works at corners and edges
- ✅ CSG operations complete without errors
- ✅ Placements persist when switching styles

---

## Conclusion

The coordinate system appears mathematically sound, but practical testing is required to identify the exact failure point. The diagnostic tools provided will quickly narrow down whether the issue is:

1. **Data (placement properties missing/invalid)**
2. **Visual (rendering positioning wrong)**
3. **CSG (subtraction geometry misaligned)**
4. **Bounds (edge detection issues)**

Once identified through testing, the targeted fix can be applied.

---

**Ready for**: Browser testing with debugging tools enabled
**Estimated fix time**: 1-2 hours once root cause identified
