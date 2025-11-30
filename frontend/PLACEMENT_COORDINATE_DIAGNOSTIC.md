# Placement Coordinate System Diagnostic

**Date**: November 29, 2025
**Issue**: Door/window trim and placement geometry off-bounds
**Status**: Investigating coordinate transformation misalignment

---

## Coordinate System Overview

### World Space Hierarchy

```
World Origin (0, 0, 0)
    ↓
ShedUltraRefined Group
  position: [0, wallHeight/2, 0]
    ↓
Wall Mesh
  position: [0, -wallHeight/2, 0]
  ↓ (Net position: [0, 0, 0])
    ↓
Door/Window Objects
  position: [calculated from normalized coords]
```

### Normalized Coordinate System

**Definition**: Placement coordinates are normalized to [0, 1] range relative to wall surface

```
Front/Back Walls:
  normalizedX: 0.0 = left edge, 1.0 = right edge (width-based)
  normalizedY: 0.0 = bottom, 1.0 = top (height-based)

Left/Right Walls:
  normalizedX: 0.0 = back edge, 1.0 = front edge (length-based)
  normalizedY: 0.0 = bottom, 1.0 = top (height-based)
```

---

## Coordinate Transformation Paths

### Path 1: Click → Normalized (Input)

**File**: `coordinateUtils.js`

**Step 1: Raycasting**
- User clicks on wall surface
- THREE.Raycaster provides intersection point in world space

**Step 2: Wall Detection**
```javascript
// Line 13-35
getWallFromIntersection(point, width, length)
// Returns: 'front', 'back', 'left', 'right'
```

**Step 3: Normalized Conversion**
```javascript
// Line 47-79
getWallNormalizedCoordinates(point, wall, width, length, wallHeight)
// Front/Back: normalizedX = (point.x + halfWidth) / width
// Left/Right: normalizedX = (point.z + halfLength) / length
// All: normalizedY = (point.y + wallHeight / 2) / wallHeight
```

**Assumption**: Point.y ranges from -wallHeight/2 to +wallHeight/2 (relative to group offset)

---

### Path 2: Normalized → Visual Door/Window (Rendering)

**File**: `DoorObject.jsx` and `WindowObject.jsx`

**Step 1: Position Calculation**
```javascript
// DoorObject.jsx lines 31-35 (Front wall example)
pos = new THREE.Vector3(
  -halfWidth + normalizedX * width,
  -wallHeight / 2 + normalizedY * wallHeight,
  halfLength + 0.3
);
```

**Step 2: Group Positioning**
```javascript
<group position={position} rotation={rotation}>
  {/* Door/Window geometry */}
</group>
```

**Step 3: Parent Group Offset**
- Group rendered inside ShedUltraRefined group
- Parent has `position={[0, wallHeight / 2, 0]}`
- **Final world position** = [0, wallHeight/2, 0] + calculated position

**Example Calculation (Front wall, normalized [0.5, 0.5])**:
```
Shed dimensions: width=12, length=16, wallHeight=8

Normalized input: normalizedX=0.5, normalizedY=0.5, wall='front'

Calculated position in DoorObject:
  X: -6 + 0.5 * 12 = -6 + 6 = 0 ✓
  Y: -4 + 0.5 * 8 = -4 + 4 = 0 ✓
  Z: 8 + 0.3 = 8.3 (slightly forward of wall surface) ✓

Parent group offset adds:
  Final Y: wallHeight/2 + 0 = 4 + 0 = 4

Final world position: [0, 4, 8.3]
```

**Assessment**: ✅ Calculation looks correct

---

### Path 3: Normalized → CSG Hole Subtraction (Invisible)

**File**: `csgOperations.js`

**Step 1: World Coordinate Conversion**
```javascript
// Lines 18-74
getWorldCoordinates(placement, shedDimensions)

// Front wall example:
position = new THREE.Vector3(
  -halfWidth + normalizedX * width,
  -wallHeight / 2 + normalizedY * wallHeight,
  halfLength
);
```

**Step 2: Subtraction Box Creation**
```javascript
// Lines 81-88
const geometry = new THREE.BoxGeometry(width, height, depth);
const mesh = new THREE.Mesh(geometry, material);
mesh.position.copy(position);
```

**Step 3: CSG Operation**
```javascript
// Lines 109
const result = this.evaluator.evaluate(baseMesh, subtractionMesh, SUBTRACTION);
```

**Critical Issue**: CSG operates on geometry VERTICES, not meshes in scene graph
- Wall geometry vertices are in local space relative to wall mesh
- Wall mesh is positioned at [0, -wallHeight/2, 0]
- CSG subtraction boxes are positioned at [calculated coordinates]
- **These coordinate systems might not align!**

---

## Problem Identification

### Coordinate System Mismatch

**CSG operates on wall geometry in local space**, but positions subtraction boxes in world space:

```
Wall Mesh Position: [0, -wallHeight/2, 0]
Wall Geometry Vertices: Range from local Y = -wallHeight/2 to +wallHeight/2
                        (In local space of wall mesh)

CSG Subtraction Box Position: [0, -wallHeight/2 + normalizedY * wallHeight, ...]
                              (In world space relative to SCENE)
```

**The Issue**: When CSG evaluates:
- Wall geometry's local coordinates are used
- Subtraction box's world coordinates are used
- **THREE.js should handle the transformation, but there may be a bug**

### Specific Failure Mode

If the wall mesh at position [0, -wallHeight/2, 0] has vertices with Y range [-wallHeight/2, +wallHeight/2]:
- Local Y = -wallHeight/2 → World Y = -wallHeight/2 + (-wallHeight/2) = -wallHeight
- Local Y = +wallHeight/2 → World Y = -wallHeight/2 + (+wallHeight/2) = 0

But the CSG subtraction box at world Y = -wallHeight/2 + normalizedY * wallHeight would be:
- For normalizedY=0.0 → World Y = -wallHeight/2 (below bottom of wall!)
- For normalizedY=1.0 → World Y = +wallHeight/2 (above top of wall!)

**FOUND IT!** The offset is wrong because the wall mesh position shifts its local coordinates.

---

## Root Cause Analysis

### Wall Geometry Local Space

The wall is created with ExtrudeGeometry:
```javascript
<extrudeGeometry args={[wallShape, extrudeSettings]} />
```

The wallShape defines vertices from -halfWidth to +halfWidth, and wallHeight (0 to wallHeight in local space).

Then the mesh is positioned at [0, -wallHeight/2, 0], which means:
- Local Y=0 maps to World Y = -wallHeight/2
- Local Y=wallHeight maps to World Y = -wallHeight/2 + wallHeight = wallHeight/2

### CSG Subtraction Box

The subtraction box is created at position:
```javascript
new THREE.Vector3(
  ...,
  -wallHeight / 2 + normalizedY * wallHeight,
  ...
)
```

This assumes the world Y range is [-wallHeight/2, wallHeight/2].

But when CSG evaluates, it needs to work in the wall geometry's LOCAL SPACE, not world space!

---

## Solution

The CSG subtraction boxes need to be positioned in the wall geometry's local coordinate space:

**Current (WRONG)**:
```javascript
position.y = -wallHeight / 2 + normalizedY * wallHeight;
```

**Corrected (RIGHT)**:
```javascript
// Wall mesh is at position [0, -wallHeight/2, 0]
// So to place something in wall local space, we need to subtract the mesh offset
const localY = (-wallHeight / 2 + normalizedY * wallHeight) - (-wallHeight / 2);
// Simplifies to:
const localY = normalizedY * wallHeight;

position.y = localY;  // Position in local space of wall
```

OR alternatively, account for the mesh offset when creating the subtraction box:

**Alternative Fix**:
```javascript
// Keep world position but offset it correctly
position.y = -wallHeight / 2 + normalizedY * wallHeight;
// This is correct IF the wall vertices are centered at Y=0
// But they're not! They range from 0 to wallHeight locally.

// So we need:
position.y = 0 + normalizedY * wallHeight - wallHeight / 2;
// Which equals:
position.y = normalizedY * wallHeight - wallHeight / 2;
```

---

## Verification Against DoorObject

**DoorObject Calculation (line 33)**:
```javascript
y: -wallHeight / 2 + normalizedY * wallHeight,
```

**DoorObject Parent Group**:
```javascript
<group position={position} rotation={rotation}>
```

**DoorObject Rendering Location**:
Positioned inside ShedUltraRefined group at [0, wallHeight/2, 0]

**Final World Position**:
```
wallHeight/2 + (-wallHeight/2 + normalizedY * wallHeight)
= normalizedY * wallHeight
```

This is CORRECT! The door/window objects end up at the right height.

**But CSG Subtraction**:
CSG operates on geometry, not scene graph, so it doesn't get the parent group offset!

The wall geometry vertices have local Y coordinates [0, wallHeight], positioned by mesh at [0, -wallHeight/2, 0].

CSG subtraction box at world Y = -wallHeight/2 + normalizedY * wallHeight...
- This converts back to local space: -wallHeight/2 + normalizedY * wallHeight + wallHeight/2 = normalizedY * wallHeight
- Which is CORRECT in local space!

Wait... let me reconsider. The THREE.js CSG evaluator should handle transformations correctly.

---

## Revised Analysis

After deeper consideration, the coordinate math actually looks **correct**. The issue might be:

1. **Bounds Clamping** - Normalized coordinates clamped to [0, 1] but clicking might produce out-of-bounds values
2. **Placement Data Type** - Width/height might not be preserved correctly
3. **CSG Geometry Clone** - The BaseGeometry might not be properly cloned
4. **Shader Compilation** - Wall rendering might fail, making CSG irrelevant
5. **Group Nesting** - Intersection test might be using wrong coordinate space

---

## Recommended Debug Steps

### For Browser Testing

1. **Log Normalized Coordinates**
   ```javascript
   // In Canvas3D.jsx, modify handleWallClick:
   console.log('Intersection point:', point);
   console.log('Wall detected:', wall);
   console.log('Normalized coords:', { normalizedX, normalizedY });
   console.log('Clamped to [0,1]:',
     Math.max(0, Math.min(1, normalizedX)),
     Math.max(0, Math.min(1, normalizedY))
   );
   ```

2. **Visualize Subtraction Boxes**
   ```javascript
   // Temporarily make CSG boxes visible
   const material = new THREE.MeshStandardMaterial({
     visible: true,  // Change from false
     color: 0xFF0000,
     transparent: true,
     opacity: 0.3
   });
   ```

3. **Check World vs Local**
   ```javascript
   // Add debugging to csgOperations.js
   console.log('Subtraction box position (world):', position);
   console.log('Wall mesh position:', wallMeshPosition);
   console.log('Expected local Y range: 0 to', wallHeight);
   ```

---

## Testing Checklist

- [ ] Click on wall and observe normalized coordinates
- [ ] Verify normalizedX and normalizedY are in [0, 1] range
- [ ] Verify door/window objects render at click location
- [ ] Enable visible CSG boxes to see if they align with door/window objects
- [ ] Check console for any coordinate transformation warnings
- [ ] Test on all four walls (front, back, left, right)
- [ ] Test at corners and edges of walls
- [ ] Verify CSG holes match visible door/window geometry

---

## Conclusion

**Hypothesis**: The coordinate system is mathematically correct, but there may be:
1. Data not being passed correctly to CSG operations
2. Visibility issue (CSG works but visually doesn't show)
3. Edge case with specific shed dimensions
4. Browser WebGL CSG implementation issue

**Next Step**: Browser testing with visualization tools to identify exact failure point.

---

**Status**: Ready for browser debugging
**Approach**: Visual verification + console logging to isolate issue
