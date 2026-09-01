import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright — the pixel half of the test suite (issue #7).
 *
 * `npm test` (vitest) covers every non-React seam and deliberately mounts
 * nothing; its `include` is `src/**\/*.test.js`, so it cannot see this folder.
 * That separation is the point: these two suites never run in the same process
 * and never import each other.
 */
export default defineConfig({
	testDir: './e2e',

	// A screenshot of a WebGL canvas is only comparable against another taken at
	// the same size, so the viewport is fixed here rather than per test.
	use: {
		...devices['Desktop Chrome'],
		viewport: { width: 1280, height: 800 },
		baseURL: 'http://localhost:5173',
	},

	// Fail loudly on a regression rather than quietly re-baselining.
	updateSnapshots: 'missing',

	// One tidy folder, because it is gitignored. The baselines are frozen
	// renders rather than source, so they are made on the machine that runs
	// the suite and never committed.
	snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',

	expect: {
		toHaveScreenshot: {
			// **Not one pixel may differ.** The issue asked for a tolerance that
			// survives driver-level antialiasing, which is the right ask when
			// baselines are shared between machines. These are not: they are
			// generated where they are checked, so there is one driver, and the
			// render is bit-exact across repeated runs — five in a row, fresh
			// browser each time, zero differing pixels.
			//
			// A tolerance costs sensitivity and buys nothing here. Measured
			// against the frozen renders, widening trim stock by 2 in moves 756
			// px of the barn and 1513 of the gable; a `maxDiffPixelRatio` of
			// 0.002 allows 961, so it passed a two-inch change on the barn. At
			// zero, a fifth of an inch (4 px) fails.
			//
			// `threshold` is left at its 0.2 default, so a pixel has to differ
			// in colour by a visible amount to count at all. That is the part
			// that absorbs noise; the pixel count is what stays strict.
			maxDiffPixels: 0,
		},
	},

	webServer: {
		command: 'npm run dev',
		url: 'http://localhost:5173',
		reuseExistingServer: !process.env.CI,
		timeout: 60_000,
	},
});
