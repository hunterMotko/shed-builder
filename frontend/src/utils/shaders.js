import * as THREE from 'three';

/**
 * Shared shader factory functions.
 * Centralized here so ShedWall, GableEnd, GableRoof, GambrelRoof all stay in sync.
 */

/**
 * Where the shed is lit from, and how hard.
 *
 * The siding and roof shaders bake their own Lambert term rather than joining
 * three's light loop, so these numbers have to be written into the GLSL. They
 * are exported because the scene's real lights — which is what trim, doors and
 * windows are lit by — must come from the same place. They used to be typed out
 * separately in three files, and `ReferenceMatch` disagreed with the shaders
 * about where the sun was: the siding took no notice of the page's lights at
 * all, so a wall and the trim board nailed to it were lit from different skies.
 *
 * The balance is overcast daylight, which is the weather in every Reference
 * Photo: mostly sky, a little direction. A lit wall lands near its own colour,
 * which is what lets a paint colour be compared against a photograph.
 */
export const SHED_LIGHTING = {
  keyPosition: [15, 20, 10],
  fillPosition: [-15, 20, -10],
  /** Baked into the shaders: fractions of the surface's own colour. */
  bakedAmbient: 0.94,
  bakedKey: 0.20,
  bakedFill: 0.10,
  /**
   * three.js light units, for every material that is not a shed shader.
   *
   * `sceneAmbient` looks enormous next to the 0.6 that was here because three
   * divides an ambient by π before it reaches a diffuse surface. The burgundy
   * trim is the calibration: `#400C0C` is a genuinely dark paint, and it has to
   * come back out of the renderer at the `#400707` the photograph measures
   * rather than the near black it did. That lands white trim just at the clip,
   * which is where the photographs have it too.
   */
  sceneAmbient: 3.0,
  sceneKey: 0.9,
  sceneFill: 0.4,
};

const { keyPosition: K, fillPosition: F } = SHED_LIGHTING;
const glslVec3 = ([x, y, z]) => `vec3(${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)})`;

/**
 * The Lambert term both shaders share, as GLSL.
 *
 * `normalExpr` is the normal to light — the roof passes a rib-perturbed one so
 * the corrugation catches light, the siding just passes its own.
 */
const lambert = (normalExpr) => `
        vec3 lKey  = normalize(${glslVec3(K)} - vWorldPos);
        vec3 lFill = normalize(${glslVec3(F)} - vWorldPos);
        float diffKey  = max(dot(${normalExpr}, lKey), 0.0);
        float diffFill = max(dot(${normalExpr}, lFill), 0.0);
        float light = ${SHED_LIGHTING.bakedAmbient.toFixed(2)}
                    + diffKey  * ${SHED_LIGHTING.bakedKey.toFixed(2)}
                    + diffFill * ${SHED_LIGHTING.bakedFill.toFixed(2)};
`;

/**
 * Hand the fragment colour to the renderer's own output pipeline.
 *
 * **Without this a custom shader is a hole in the colour pipeline.** Three
 * converts every colour to linear on the way in — `new THREE.Color('#EFD7BA')`
 * is a linear triple by the time it reaches a uniform — and converts back to
 * sRGB on the way out via this chunk. A shader that writes `gl_FragColor` and
 * stops skips the conversion back, so the linear value is displayed as though
 * it were sRGB and every surface renders far too dark: almond siding measured
 * `#6C5943` against `#EFD7BA` asked for, and a brown roof came out near black.
 *
 * Including the chunks rather than writing the transform means the shaders
 * follow whatever the renderer is set to, tone mapping included.
 */
const OUTPUT_PIPELINE = `
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
`;

const SHARED_VERTEX = `
      varying vec3 vPos;
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      void main() {
        vPos = position;
        vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

/**
 * T1-11 grooves are 8 inches on centre.
 *
 * Measured off `12-16-gable-front.jpg`, which is square on: the wall is 582 px
 * across a known 12 ft, and the grooves fall every 32 px — 7.9 in, five gaps
 * running. It was 6 in here, which read as too busy against the photograph.
 */
export const SIDING_GROOVE_SPACING_FT = 8 / 12;

/**
 * Returns a ShaderMaterial config for shed siding.
 * T1-11 mode adds vertical groove lines; smooth mode suppresses them.
 */
export function makeSidingShader(color, sidingTexture) {
  return {
    uniforms: {
      color:   { value: new THREE.Color(color) },
      useRibs: { value: sidingTexture === 'T1-11' ? 1.0 : 0.0 },
    },
    vertexShader: SHARED_VERTEX,
    fragmentShader: `
      varying vec3 vPos;
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      uniform vec3 color;
      uniform float useRibs;

      void main() {
        // T1-11 vertical grooves. Local X runs across every wall's own face
        // (ShedWall rotates the side walls), so the grooves stand up on all four.
        float rib = mod(vPos.x * ${(1 / SIDING_GROOVE_SPACING_FT).toFixed(4)}, 1.0);
        float ribEffect = smoothstep(0.4, 0.45, rib) - smoothstep(0.55, 0.6, rib);
        vec3 baseColor = color * (1.0 - ribEffect * 0.12 * useRibs);

        vec3 n = normalize(vNormal);
${lambert('n')}
        gl_FragColor = vec4(baseColor * light, 1.0);
${OUTPUT_PIPELINE}
      }
    `,
  };
}

/**
 * Roof panel ribs are 10 inches on centre, running down the slope.
 *
 * Measured off `barn_barndoors.jpg`. The ribs recede with the building, so the
 * spacing cannot be read straight off the image — the gaps run 6 px at the far
 * end and 15 px at the near one. Fitting the projective map x(t) = (at+b)/(ct+1)
 * to eighteen consecutive ribs (it predicts the ones held back to ±1 px) puts
 * the roof's own two ends 24.7 ribs apart. Over 20 ft of shed plus two 2 in
 * overhangs that is 9.9 in, and the panel is sold in 9 and 12; 10 in is the
 * measurement, and the uncertainty at each end covers 9.
 */
export const ROOF_RIB_SPACING_FT = 10 / 12;

/**
 * Returns a ShaderMaterial config for shed roofing.
 * Metal mode: corrugated panels with Blinn-Phong specular + silver sheen.
 * Shingle mode: horizontal courses with staggered column breaks.
 * Blended via isShingle uniform (0.0 = metal, 1.0 = shingle).
 *
 * Three.js auto-injects: modelMatrix, projectionMatrix, modelViewMatrix,
 * normalMatrix, cameraPosition into all ShaderMaterials.
 */
export function makeRoofShader(roofColor, roofMaterial) {
  return {
    uniforms: {
      color:     { value: new THREE.Color(roofColor) },
      isShingle: { value: roofMaterial === 'shingle' ? 1.0 : 0.0 },
    },
    vertexShader: SHARED_VERTEX,
    fragmentShader: `
      varying vec3 vPos;
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      uniform vec3 color;
      uniform float isShingle;

      void main() {
        vec3 n = normalize(vNormal);

        // ── Metal / corrugated barn tin ─────────────────────────────
        // A panel runs ridge to eave, so the ribs run DOWN THE SLOPE and the
        // pattern repeats along the building. The roof is extruded along Z, so
        // that is local Z. Repeating along X instead drew the ribs parallel to
        // the ridge — banding across the slope, which no roof does.
        float t = mod(vPos.z * ${(1 / ROOF_RIB_SPACING_FT).toFixed(4)}, 1.0);

        // Sine-wave corrugation profile: 1 at ridge crown, 0 at valley
        float corrugation = 0.5 + 0.5 * cos(t * 6.28318);

        // Normal perturbation from the derivative of the corrugation profile,
        // tilted along the same axis the ribs repeat on.
        float dCorrugation = -sin(t * 6.28318) * 1.1;
        vec3 ribNormal = normalize(n + vec3(0.0, 0.0, dCorrugation));

        // Ridges ~2× as bright as valleys for clearly visible ribs at a distance
        vec3 metalBase = color * (0.62 + corrugation * 0.38);

${lambert('ribNormal')}
        // Blinn-Phong specular — concentrated tightly on ridge crowns
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        vec3 halfDir = normalize(lKey + viewDir);
        float spec = pow(max(dot(ribNormal, halfDir), 0.0), 64.0);
        float metalSpec = spec * corrugation * 2.0;

        vec3 silver = vec3(0.90, 0.93, 0.95);
        vec3 metalColor = metalBase * light + silver * metalSpec * 0.35;

        // ── Shingle path ─────────────────────────────────────────────
        float coursePos = mod(vPos.y * 1.0, 1.0);
        float course = floor(vPos.y * 1.0);
        float stagger = mod(course, 2.0) * 0.5;
        float shinglePos = mod((vPos.x + stagger) / 1.2, 1.0);
        float shadowLine = smoothstep(0.0, 0.15, coursePos);
        float divLine = smoothstep(0.88, 0.95, shinglePos);
        // Shingles also get Lambert diffuse (no specular — matte surface)
        vec3 shingleBase = color * (0.72 + shadowLine * 0.28) * (1.0 - divLine * 0.15);
        vec3 shingleColor = shingleBase * light;

        gl_FragColor = vec4(mix(metalColor, shingleColor, isShingle), 1.0);
${OUTPUT_PIPELINE}
      }
    `,
  };
}
