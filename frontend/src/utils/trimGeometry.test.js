import { describe, it, expect } from 'vitest';
import { roofRidgeCap } from './trimGeometry';

/**
 * What is left of this file, and why.
 *
 * It once held thirty-nine property tests over seven per-piece wrappers and
 * two real pieces of band geometry. All of that is the kernel's now, and the
 * four trim and roof components ask for a whole `trimSet` or `roofMetal`
 * rather than listing their own pieces — so nothing here had a subject left.
 *
 * The properties were not dropped on the floor. `docs/trim-geometry.md` in the
 * kernel maps every one of them to the `src/trim.rs` test that asserts it now,
 * and records the two the kernel turned out to be missing — the J-channel
 * straddling the ridge, and where the eave board lands term by term. Both were
 * added there before anything was deleted here.
 *
 * `roofRidgeCap` stays because `Skylight.jsx` still calls it directly for the
 * glass, and these are the tests for the two shapes this wrapper puts back:
 * the `kind` the kernel keeps in the id, and the over-long-skylight report the
 * kernel returns beside the pieces rather than on one of them.
 */

// A 12x20 shed, as every test here has used.
const LENGTH = 20;
const WALL_HEIGHT = 8;

describe('roofRidgeCap', () => {
	// A 6:12 gable peaking 3 ft over the wall, with a 6 in overhang.
	const caps = roofRidgeCap(3, 0.5, LENGTH, WALL_HEIGHT, { overhang: 0.5 });
	const by = (id) => caps.find((c) => c.id === id);

	it('folds one leg down each slope', () => {
		expect(caps.map((c) => c.id).sort()).toEqual(['ridge-cap-left', 'ridge-cap-right']);
	});

	it('runs the whole slab, overhang included, centred on the shed', () => {
		for (const c of caps) {
			expect(c.size[2]).toBeCloseTo(LENGTH + 1, 10);
			expect(c.position[2]).toBeCloseTo(0, 10);
		}
	});

	it('lies at the pitch of its slope, mirrored across the ridge', () => {
		expect(Math.tan(by('ridge-cap-right').rotation[2])).toBeCloseTo(-0.5, 10);
		expect(Math.tan(by('ridge-cap-left').rotation[2])).toBeCloseTo(0.5, 10);
	});

	it('sits on the weather side, just off the panel at the peak', () => {
		// Each leg's centre must be above its own slope line y = 3 - 0.5|x|,
		// but by no more than the metal's own thickness and lift.
		for (const c of caps) {
			const surface = WALL_HEIGHT + 3 - 0.5 * Math.abs(c.position[0]);
			expect(c.position[1]).toBeGreaterThan(surface);
			expect(c.position[1] - surface).toBeLessThan(0.1);
		}
	});
});

describe('roofRidgeCap with a ridge skylight', () => {
	// The same 6:12 gable, 20 ft long over a 6 in overhang, so the ridge line
	// runs 21 ft end to end. An 8 ft skylight sits centred in it, which leaves
	// 13 ft of cap: 6.5 ft each side of the glass, reaching from the eave tip
	// at |z| = 10.5 in to the edge of the glass at |z| = 4, and so centred at
	// |z| = 7.25.
	const RUN = 8;
	const runs = roofRidgeCap(3, 0.5, LENGTH, WALL_HEIGHT, {
		overhang: 0.5,
		skylightFt: RUN,
	});
	const caps = runs.filter((r) => r.kind === 'cap');

	it('breaks each leg into a cap either side of the glass', () => {
		expect(caps).toHaveLength(4);
		for (const c of caps) {
			expect(c.size[2]).toBeCloseTo(6.5, 10);
			expect(Math.abs(c.position[2])).toBeCloseTo(7.25, 10);
		}
	});

	it('fills the gap with the glass the metal would have covered', () => {
		const glass = runs.filter((r) => r.kind === 'glass');
		expect(glass.map((g) => g.id).sort()).toEqual([
			'ridge-glass-left',
			'ridge-glass-right',
		]);

		// A skylight is a length of the cap that happens to be glass: same
		// plane, same fold down each slope, same width of the ridge covered.
		// The cap this roof gets with no skylight is the independent statement
		// of where that is, and it is pinned by hand above.
		const metal = roofRidgeCap(3, 0.5, LENGTH, WALL_HEIGHT, { overhang: 0.5 });
		for (const side of ['left', 'right']) {
			const g = glass.find((r) => r.id === `ridge-glass-${side}`);
			const m = metal.find((r) => r.id === `ridge-cap-${side}`);
			expect(g.position[0]).toBeCloseTo(m.position[0], 10);
			expect(g.position[1]).toBeCloseTo(m.position[1], 10);
			expect(g.position[2]).toBeCloseTo(0, 10);
			expect(g.rotation).toEqual(m.rotation);
			expect(g.size[0]).toBeCloseTo(m.size[0], 10);
			expect(g.size[1]).toBeCloseTo(m.size[1], 10);
			expect(g.size[2]).toBeCloseTo(RUN, 10);
		}
	});
});

describe('roofRidgeCap with more skylight than ridge', () => {
	// 30 ft of skylight asked for on the same 20 ft shed. Including the 6 in
	// overhang at each end there are only 21 ft of ridge to give, so the glass
	// takes all of it and there is no metal cap left to render.
	const runs = roofRidgeCap(3, 0.5, LENGTH, WALL_HEIGHT, {
		overhang: 0.5,
		skylightFt: 30,
	});

	it('gives the whole ridge to the glass and says what it could not fit', () => {
		expect(runs.filter((r) => r.kind === 'cap')).toHaveLength(0);

		const glass = runs.filter((r) => r.kind === 'glass');
		expect(glass).toHaveLength(2);
		for (const g of glass) {
			expect(g.size[2]).toBeCloseTo(LENGTH + 1, 10);
			expect(g.clampedFrom).toBe(30);
		}
	});

	it('says nothing when the run fits', () => {
		const fits = roofRidgeCap(3, 0.5, LENGTH, WALL_HEIGHT, {
			overhang: 0.5,
			skylightFt: 8,
		});
		for (const r of fits) expect(r.clampedFrom).toBeUndefined();
	});
});
