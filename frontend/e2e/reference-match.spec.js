import { test, expect } from '@playwright/test';

/**
 * Screenshot regression for the two approved reference Designs (issue #7).
 *
 * The suite drives the Reference Match page the way a person does — nav, then
 * the target button — so the render under test is the real `BarnShed` /
 * `GableShed` behind the real fixtures (ADR-0012). Nothing here imports a
 * component or a geometry function; the seam is the `<canvas>` and only the
 * `<canvas>`.
 *
 * The Reference Photo beside it is deliberately out of frame. `reference/` is
 * gitignored, so a clone without the photos shows a placeholder there, and a
 * baseline containing it would fail for a reason that has nothing to do with
 * the shed.
 */

const TARGETS = ['barn-barndoors', 'gable-front'];

/**
 * Open Reference Match at one target and hand back its canvas, once it is
 * actually drawing.
 *
 * **Wait for the canvas to reach its pane, not merely to exist.** Switching
 * target remounts the `<Canvas>` — it is keyed by target id, so that R3F picks
 * up the new camera — and a fresh canvas spends a moment at the HTML default
 * 300 x 150 before R3F sizes it. Waiting on `width * height > 0` returns during
 * that moment: the second target measured 300 x 150 where the first measured
 * 639 x 752, and a baseline frozen through that guard is a grey box.
 */
async function reconstruction(page, targetId) {
	await page.goto('/');
	await page.getByRole('button', { name: 'Reference Match' }).click();
	await page.getByRole('button', { name: targetId, exact: true }).click();

	const canvas = page.locator('canvas');
	await expect(canvas).toBeVisible();
	await expect
		.poll(() =>
			canvas.evaluate((c) => {
				const self = c.getBoundingClientRect();
				const pane = c.parentElement.getBoundingClientRect();
				return (
					Math.round(self.width) === Math.round(pane.width) &&
					Math.round(self.height) === Math.round(pane.height)
				);
			})
		)
		.toBe(true);
	return canvas;
}

/** One square of the page, as PNG bytes. */
const patch = (page, x, y, size) =>
	page.screenshot({ clip: { x, y, width: size, height: size } });

for (const targetId of TARGETS) {
	test(`${targetId} draws a building rather than an empty canvas`, async ({ page }) => {
		const canvas = await reconstruction(page, targetId);
		const box = await canvas.boundingBox();

		// Three equal squares, taken down the RIGHT edge and through the middle.
		// The page paints a badge over the top left of the canvas and a caption
		// over the bottom centre; a square holding either differs from its
		// neighbour whether or not anything was ever drawn, which is a green
		// test that cannot fail. Both sky squares are clear of them.
		const size = 100;
		const right = box.x + box.width - size - 8;
		const skyTop = await patch(page, right, box.y + 8, size);
		const skyBelow = await patch(page, right, box.y + 120, size);
		const middle = await patch(
			page,
			box.x + box.width / 2 - size / 2,
			box.y + box.height / 2 - size / 2,
			size
		);

		// Empty sky is flat, so two squares of it encode to the same bytes.
		// That is what a canvas with no WebGL context looks like everywhere.
		expect(Buffer.compare(skyTop, skyBelow)).toBe(0);
		// The middle of the frame is where the shed stands, so it is not flat.
		expect(Buffer.compare(skyTop, middle)).not.toBe(0);
	});
}

for (const targetId of TARGETS) {
	test(`${targetId} matches its frozen render`, async ({ page }) => {
		const canvas = await reconstruction(page, targetId);
		await expect(canvas).toHaveScreenshot(`${targetId}.png`);
	});
}
