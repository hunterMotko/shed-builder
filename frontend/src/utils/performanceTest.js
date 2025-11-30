/**
 * Performance Testing Utilities
 *
 * Measures rendering performance with various placement counts
 * Helps identify performance bottlenecks at scale
 */

/**
 * Generate test placements for performance benchmarking
 * @param {number} count - Number of placements to generate
 * @param {object} shed - Shed dimensions {width, length, wallHeight}
 * @returns {array} Array of placement objects
 */
export function generateTestPlacements(count, shed = { width: 12, length: 16, wallHeight: 8 }) {
  const placements = [];
  const walls = ['front', 'back', 'left', 'right'];

  // Generate evenly-distributed placements across all walls
  const placementsPerWall = Math.ceil(count / walls.length);

  for (let w = 0; w < walls.length; w++) {
    const wall = walls[w];
    const wallWidth = wall === 'front' || wall === 'back' ? shed.width : shed.length;
    const wallHeight = shed.wallHeight;

    for (let i = 0; i < placementsPerWall && placements.length < count; i++) {
      // Distribute horizontally across wall width
      const normalizedX = (i + 1) / (placementsPerWall + 1);

      // Vary vertical positions
      const normalizedY = 0.4 + (Math.random() * 0.3); // Between 40% and 70% height

      // Vary door/window sizes
      const isMostlyDoors = Math.random() > 0.5;
      const width = isMostlyDoors ? 2.667 : 1.5; // 32" doors, 18" windows
      const height = isMostlyDoors ? 6.5 : 2.5; // 78" doors, 30" windows

      placements.push({
        id: `test-placement-${placements.length}`,
        type: isMostlyDoors ? 'door' : 'window',
        wall,
        normalizedX,
        normalizedY,
        width,
        height,
      });
    }
  }

  return placements.slice(0, count);
}

/**
 * Performance benchmark class for measuring CSG operations
 */
export class PerformanceBenchmark {
  constructor() {
    this.measurements = [];
  }

  /**
   * Start measuring a named operation
   * @param {string} name - Operation name
   */
  start(name) {
    this.measurements.push({
      name,
      startTime: performance.now(),
      endTime: null,
      duration: null,
    });
  }

  /**
   * End measurement and record duration
   * @param {string} name - Operation name (should match start())
   */
  end(name) {
    const measurement = this.measurements.find((m) => m.name === name && m.endTime === null);
    if (measurement) {
      measurement.endTime = performance.now();
      measurement.duration = measurement.endTime - measurement.startTime;
    }
  }

  /**
   * Get all measurements
   * @returns {array} Array of measurements with durations
   */
  getMeasurements() {
    return this.measurements.filter((m) => m.duration !== null);
  }

  /**
   * Get average duration for named operations
   * @param {string} name - Operation name
   * @returns {object} {count, average, min, max, total}
   */
  getStats(name) {
    const ops = this.measurements.filter((m) => m.name === name && m.duration !== null);
    if (ops.length === 0) return null;

    const durations = ops.map((m) => m.duration);
    const total = durations.reduce((a, b) => a + b, 0);
    const average = total / durations.length;
    const min = Math.min(...durations);
    const max = Math.max(...durations);

    return { count: ops.length, average, min, max, total };
  }

  /**
   * Get summary report
   * @returns {object} Formatted report with all stats
   */
  getReport() {
    const uniqueOps = [...new Set(this.measurements.map((m) => m.name))];
    const report = {};

    for (const opName of uniqueOps) {
      const stats = this.getStats(opName);
      if (stats) {
        report[opName] = {
          operations: stats.count,
          averageMs: Math.round(stats.average * 100) / 100,
          minMs: Math.round(stats.min * 100) / 100,
          maxMs: Math.round(stats.max * 100) / 100,
          totalMs: Math.round(stats.total * 100) / 100,
        };
      }
    }

    return report;
  }

  /**
   * Print formatted report to console
   */
  printReport() {
    const report = this.getReport();
    console.log('=== Performance Report ===');
    for (const [opName, stats] of Object.entries(report)) {
      console.log(`\n${opName}:`);
      console.log(`  Operations: ${stats.operations}`);
      console.log(`  Average: ${stats.averageMs}ms`);
      console.log(`  Range: ${stats.minMs}ms - ${stats.maxMs}ms`);
      console.log(`  Total: ${stats.totalMs}ms`);
    }
  }

  /**
   * Clear all measurements
   */
  reset() {
    this.measurements = [];
  }
}

/**
 * Simulate performance degradation test
 * Measures timing as placement count increases
 * @returns {object} Performance data across different placement counts
 */
export function performanceDegradationTest() {
  const results = [];
  const placementCounts = [1, 3, 5, 7, 10];
  const shedDimensions = { width: 12, length: 16, wallHeight: 8 };

  for (const count of placementCounts) {
    const benchmark = new PerformanceBenchmark();
    const placements = generateTestPlacements(count, shedDimensions);

    // Simulate CSG operation time based on placement count
    // Real timing would come from actual THREE.js operations
    const baseTimePerPlacement = 2; // milliseconds
    const setupTime = 1; // milliseconds

    benchmark.start('CSG_setup');
    // Simulate setup
    for (let i = 0; i < setupTime; i++) {
      Math.sqrt(i);
    }
    benchmark.end('CSG_setup');

    for (let i = 0; i < count; i++) {
      benchmark.start('CSG_subtraction');
      // Simulate CSG subtraction operation
      for (let j = 0; j < baseTimePerPlacement * 1000; j++) {
        Math.sqrt(j);
      }
      benchmark.end('CSG_subtraction');
    }

    const report = benchmark.getReport();
    results.push({
      placementCount: count,
      performance: report,
      estimatedFrameTime: count * baseTimePerPlacement + setupTime,
    });
  }

  return results;
}

/**
 * Check if performance meets acceptable thresholds
 * @param {object} benchmark - PerformanceBenchmark instance
 * @returns {object} {isAcceptable, violations}
 */
export function validatePerformance(benchmark) {
  const THRESHOLDS = {
    CSG_subtraction: 50, // max 50ms per subtraction
    CSG_setup: 5, // max 5ms setup
    render: 16.67, // max 16.67ms per frame (60 FPS)
  };

  const report = benchmark.getReport();
  const violations = [];

  for (const [opName, stats] of Object.entries(report)) {
    const threshold = THRESHOLDS[opName];
    if (threshold && stats.averageMs > threshold) {
      violations.push({
        operation: opName,
        average: stats.averageMs,
        threshold,
        exceeded: Math.round((stats.averageMs / threshold - 1) * 100),
      });
    }
  }

  return {
    isAcceptable: violations.length === 0,
    violations,
    report,
  };
}

/**
 * Memory estimation for placements
 * Rough estimate of geometry memory used
 * @param {number} placementCount - Number of placements
 * @returns {object} {estimatedBytes, estimatedMB, breakdown}
 */
export function estimateMemoryUsage(placementCount) {
  // Rough estimates (actual depends on geometry complexity)
  const bytesPerPlacement = 50000; // ~50KB per CSG operation
  const baseGeometryBytes = 500000; // ~500KB base wall geometry
  const totalBytes = baseGeometryBytes + placementCount * bytesPerPlacement;

  return {
    estimatedBytes: totalBytes,
    estimatedMB: Math.round((totalBytes / 1024 / 1024) * 100) / 100,
    breakdown: {
      baseGeometry: `${Math.round(baseGeometryBytes / 1024)}KB`,
      perPlacement: `${Math.round(bytesPerPlacement / 1024)}KB`,
      total: `${Math.round(totalBytes / 1024)}KB`,
    },
  };
}

// Export utilities for browser console testing
if (typeof window !== 'undefined') {
  window.performanceTestUtils = {
    generateTestPlacements,
    PerformanceBenchmark,
    performanceDegradationTest,
    validatePerformance,
    estimateMemoryUsage,
  };
}
