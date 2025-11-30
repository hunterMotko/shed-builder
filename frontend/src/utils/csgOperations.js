import { Evaluator, SUBTRACTION } from 'three-bvh-csg';
import * as THREE from 'three';

/**
 * CSG operations for cutting doors and windows from shed geometry
 */
class CSGShedModifier {
  constructor() {
    this.evaluator = new Evaluator();
  }

  /**
   * Convert normalized coordinates to world coordinates
   * @param {Object} placement - Placement data {normalizedX, normalizedY, width, height, wall}
   * @param {Object} shedDimensions - {width, length, wallHeight}
   * @returns {{position: THREE.Vector3, size: {width, height, depth}}}
   */
  getWorldCoordinates(placement, shedDimensions) {
    const { width, length, wallHeight } = shedDimensions;
    const { normalizedX, normalizedY, wall } = placement;
    const halfWidth = width / 2;
    const halfLength = length / 2;

    let position;
    const elemWidth = placement.width;
    const elemHeight = placement.height;
    const elemDepth = 0.5; // Thickness of the opening (slightly more than wall)

    switch (wall) {
      case 'front':
        position = new THREE.Vector3(
          -halfWidth + normalizedX * width,
          -wallHeight / 2 + normalizedY * wallHeight,
          halfLength
        );
        break;

      case 'back':
        position = new THREE.Vector3(
          -halfWidth + normalizedX * width,
          -wallHeight / 2 + normalizedY * wallHeight,
          -halfLength
        );
        break;

      case 'left':
        position = new THREE.Vector3(
          -halfWidth,
          -wallHeight / 2 + normalizedY * wallHeight,
          -halfLength + normalizedX * length
        );
        break;

      case 'right':
        position = new THREE.Vector3(
          halfWidth,
          -wallHeight / 2 + normalizedY * wallHeight,
          -halfLength + normalizedX * length
        );
        break;

      default:
        position = new THREE.Vector3(0, 0, 0);
    }

    return {
      position,
      size: {
        width: elemWidth,
        height: elemHeight,
        depth: elemDepth,
      },
    };
  }

  /**
   * Create a subtraction box for a door/window opening
   * @param {Object} worldCoords - Result from getWorldCoordinates
   * @returns {THREE.Mesh} A mesh representing the opening
   */
  createSubtractionBox(worldCoords) {
    const { position, size } = worldCoords;
    const geometry = new THREE.BoxGeometry(size.width, size.height, size.depth);
    const material = new THREE.MeshStandardMaterial({ visible: false });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    return mesh;
  }

  /**
   * Subtract a single opening from the shed geometry
   * @param {THREE.BufferGeometry} baseGeometry - The base shed geometry
   * @param {Object} placement - Placement data
   * @param {Object} shedDimensions - Shed dimensions
   * @returns {THREE.BufferGeometry} Modified geometry with hole cut
   */
  subtractOpening(baseGeometry, placement, shedDimensions) {
    try {
      // Get world coordinates for the placement
      const worldCoords = this.getWorldCoordinates(placement, shedDimensions);

      // Create subtraction box mesh
      const subtractionMesh = this.createSubtractionBox(worldCoords);

      // Convert geometries to meshes for CSG
      const baseMesh = new THREE.Mesh(baseGeometry.clone());

      // Perform CSG subtraction
      const result = this.evaluator.evaluate(baseMesh, subtractionMesh, SUBTRACTION);

      // Extract and return the geometry
      return result.geometry;
    } catch (error) {
      console.error('Error performing CSG subtraction:', error);
      // Return original geometry on error
      return baseGeometry;
    }
  }

  /**
   * Apply all placements to geometry sequentially
   * @param {THREE.BufferGeometry} baseGeometry - The base shed geometry
   * @param {Array} placements - Array of placement objects
   * @param {Object} shedDimensions - Shed dimensions
   * @returns {THREE.BufferGeometry} Modified geometry with all holes cut
   */
  applyAllPlacements(baseGeometry, placements, shedDimensions) {
    if (!placements || placements.length === 0) {
      return baseGeometry;
    }

    let resultGeometry = baseGeometry.clone();

    for (const placement of placements) {
      resultGeometry = this.subtractOpening(resultGeometry, placement, shedDimensions);
    }

    return resultGeometry;
  }

  /**
   * Subtract an opening from roof geometry (for future skylight support)
   * @param {THREE.BufferGeometry} roofGeometry - The roof geometry
   * @param {Object} placement - Placement data {x, y, width, height}
   * @param {Object} roofDimensions - {width, length, roofType} where roofType is 'lower' or 'upper' for Gambrel
   * @returns {THREE.BufferGeometry} Modified geometry with hole cut
   */
  subtractRoofOpening(roofGeometry, placement, roofDimensions) {
    try {
      const { x, y, width: elemWidth, height: elemHeight } = placement;
      const { width, length } = roofDimensions;
      const halfWidth = width / 2;
      const halfLength = length / 2;

      // Position for roof opening (centered on roof surface)
      const position = new THREE.Vector3(
        x !== undefined ? x : 0,
        y !== undefined ? y : 0,
        halfLength // On front surface of roof
      );

      const elemDepth = 0.5;
      const size = { width: elemWidth, height: elemHeight, depth: elemDepth };

      // Create subtraction box
      const geometry = new THREE.BoxGeometry(size.width, size.height, size.depth);
      const material = new THREE.MeshStandardMaterial({ visible: false });
      const subtractionMesh = new THREE.Mesh(geometry, material);
      subtractionMesh.position.copy(position);

      // Convert geometries to meshes for CSG
      const baseMesh = new THREE.Mesh(roofGeometry.clone());

      // Perform CSG subtraction
      const result = this.evaluator.evaluate(baseMesh, subtractionMesh, SUBTRACTION);

      return result.geometry;
    } catch (error) {
      console.error('Error performing roof CSG subtraction:', error);
      return roofGeometry;
    }
  }

  /**
   * Apply roof openings to Gambrel lower roof section
   * @param {THREE.BufferGeometry} lowerRoofGeometry - Lower roof geometry
   * @param {Array} roofPlacements - Array of roof opening placements
   * @param {Object} shedDimensions - Shed dimensions
   * @returns {THREE.BufferGeometry} Modified geometry
   */
  applyLowerRoofOpenings(lowerRoofGeometry, roofPlacements, shedDimensions) {
    if (!roofPlacements || roofPlacements.length === 0) {
      return lowerRoofGeometry;
    }

    let resultGeometry = lowerRoofGeometry.clone();
    for (const placement of roofPlacements) {
      resultGeometry = this.subtractRoofOpening(
        resultGeometry,
        placement,
        { width: shedDimensions.width, length: shedDimensions.length, roofType: 'lower' }
      );
    }
    return resultGeometry;
  }

  /**
   * Apply roof openings to Gambrel upper roof section
   * @param {THREE.BufferGeometry} upperRoofGeometry - Upper roof geometry
   * @param {Array} roofPlacements - Array of roof opening placements
   * @param {Object} shedDimensions - Shed dimensions
   * @returns {THREE.BufferGeometry} Modified geometry
   */
  applyUpperRoofOpenings(upperRoofGeometry, roofPlacements, shedDimensions) {
    if (!roofPlacements || roofPlacements.length === 0) {
      return upperRoofGeometry;
    }

    let resultGeometry = upperRoofGeometry.clone();
    for (const placement of roofPlacements) {
      resultGeometry = this.subtractRoofOpening(
        resultGeometry,
        placement,
        { width: shedDimensions.width, length: shedDimensions.length, roofType: 'upper' }
      );
    }
    return resultGeometry;
  }

  /**
   * Dispose resources (cleanup)
   */
  dispose() {
    // Cleanup if needed
  }
}

export const csgModifier = new CSGShedModifier();
export { CSGShedModifier };
