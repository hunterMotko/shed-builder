import { describe, it, expect } from 'vitest';
import {
	makeSidingShader,
	makeRoofShader,
	SHED_LIGHTING,
	SIDING_GROOVE_SPACING_FT,
	ROOF_RIB_SPACING_FT,
} from './shaders';

/**
 * These assert the two things about a custom shader that cannot be seen by
 * looking at it and are invisible until someone compares a render against a
 * photograph — which is exactly how both of them were found.
 */
describe('the shed shaders', () => {
	const siding = makeSidingShader('#EFD7BA', 'T1-11');
	const roof = makeRoofShader('#9BA1A4', 'metal');

	describe('hand their colour to the renderer, not to the framebuffer', () => {
		// Three converts every colour to linear on the way in and back to sRGB on
		// the way out. A shader that writes gl_FragColor and stops keeps the
		// linear value, and it is displayed as though it were sRGB: almond siding
		// measured #6C5943 against the #EFD7BA it was given, and a brown roof came
		// out near black. Including the chunks rather than writing the transform
		// also means the shaders follow the renderer's tone mapping.
		for (const [name, shader] of [['siding', siding], ['roof', roof]]) {
			it(`${name} runs the output pipeline`, () => {
				expect(shader.fragmentShader).toContain('#include <colorspace_fragment>');
				expect(shader.fragmentShader).toContain('#include <tonemapping_fragment>');
			});

			it(`${name} writes gl_FragColor before converting it`, () => {
				const src = shader.fragmentShader;
				expect(src.indexOf('gl_FragColor')).toBeLessThan(
					src.indexOf('#include <colorspace_fragment>')
				);
			});
		}
	});

	describe('run their ribs the way the panel does', () => {
		// A roof panel goes ridge to eave, so the ribs run DOWN the slope and the
		// pattern repeats along the building. The roof is extruded along Z, so the
		// corrugation has to vary with local Z. It varied with X, which drew the
		// ribs parallel to the ridge — banding across the slope, which no roof has.
		it('the roof corrugation repeats along the length, not across the slope', () => {
			expect(roof.fragmentShader).toMatch(/mod\(vPos\.z \* [\d.]+, 1\.0\)/);
			expect(roof.fragmentShader).not.toMatch(/corrugation[\s\S]*mod\(vPos\.x/);
		});

		it('perturbs the rib normal along the axis the ribs repeat on', () => {
			expect(roof.fragmentShader).toContain('vec3(0.0, 0.0, dCorrugation)');
		});

		// T1-11 grooves are vertical, so they repeat across the wall's own face.
		// ShedWall rotates the side walls, so local X is that face on all four.
		it('the siding grooves repeat across the wall', () => {
			expect(siding.fragmentShader).toMatch(/mod\(vPos\.x \* [\d.]+, 1\.0\)/);
		});
	});

	describe('at the spacings the Reference Photos measure', () => {
		// Both are stated as a spacing and used as a frequency; getting the
		// reciprocal backwards is silent and halves or doubles the pattern.
		const frequencyIn = (src) => Number(src.match(/mod\(vPos\.[xz] \* ([\d.]+),/)[1]);

		it('T1-11 grooves fall every 8 inches', () => {
			expect(SIDING_GROOVE_SPACING_FT * 12).toBeCloseTo(8, 6);
			expect(frequencyIn(siding.fragmentShader)).toBeCloseTo(1 / SIDING_GROOVE_SPACING_FT, 3);
		});

		it('roof ribs fall every 10 inches', () => {
			expect(ROOF_RIB_SPACING_FT * 12).toBeCloseTo(10, 6);
			expect(frequencyIn(roof.fragmentShader)).toBeCloseTo(1 / ROOF_RIB_SPACING_FT, 3);
		});
	});

	describe('are lit from the same sky the scene is', () => {
		// The shaders bake their own Lambert, so a scene that lights the shed from
		// somewhere else lights only the trim. Both must read SHED_LIGHTING.
		const asGlsl = ([x, y, z]) =>
			`vec3(${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)})`;

		for (const [name, shader] of [['siding', siding], ['roof', roof]]) {
			it(`${name} bakes the shared light positions`, () => {
				expect(shader.fragmentShader).toContain(asGlsl(SHED_LIGHTING.keyPosition));
				expect(shader.fragmentShader).toContain(asGlsl(SHED_LIGHTING.fillPosition));
			});
		}

		// Overcast: a lit wall lands near its own colour, which is the property
		// that lets a paint colour be compared against a photograph at all.
		it('leaves a face turned away from both lights near its own colour', () => {
			expect(SHED_LIGHTING.bakedAmbient).toBeGreaterThan(0.85);
		});

		it('never drives a surface past its own colour by much', () => {
			const brightest =
				SHED_LIGHTING.bakedAmbient + SHED_LIGHTING.bakedKey + SHED_LIGHTING.bakedFill;
			expect(brightest).toBeLessThan(1.3);
		});
	});
});
