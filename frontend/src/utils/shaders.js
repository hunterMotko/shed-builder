import * as THREE from 'three';

/**
 * Shared shader factory functions.
 * Centralized here so ShedWall, GableEnd, GableRoof, GambrelRoof all stay in sync.
 */

/**
 * Returns a ShaderMaterial config for shed siding.
 * T1-11 mode adds vertical groove lines; smooth mode suppresses them.
 * Lambert diffuse from the two scene lights gives walls light/shadow response.
 */
export function makeSidingShader(color, sidingTexture) {
  return {
    uniforms: {
      color:   { value: new THREE.Color(color) },
      useRibs: { value: sidingTexture === 'T1-11' ? 1.0 : 0.0 },
    },
    vertexShader: `
      varying vec3 vPos;
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      void main() {
        vPos = position;
        vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vPos;
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      uniform vec3 color;
      uniform float useRibs;

      void main() {
        // T1-11 vertical groove lines
        float rib = mod(vPos.x * 2.0, 1.0);
        float ribEffect = smoothstep(0.4, 0.45, rib) - smoothstep(0.55, 0.6, rib);
        vec3 baseColor = color * (1.0 - ribEffect * 0.12 * useRibs);

        // Lambert diffuse — two scene lights (matches App.jsx)
        vec3 n = normalize(vNormal);
        vec3 l1 = normalize(vec3(15.0, 20.0, 10.0) - vWorldPos);
        vec3 l2 = normalize(vec3(-15.0, 20.0, -10.0) - vWorldPos);
        float diff1 = max(dot(n, l1), 0.0) * 1.0;
        float diff2 = max(dot(n, l2), 0.0) * 0.5;
        float ambient = 0.50;
        float light = ambient + diff1 * 0.35 + diff2 * 0.15;

        gl_FragColor = vec4(baseColor * light, 1.0);
      }
    `,
  };
}

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
    vertexShader: `
      varying vec3 vPos;
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      void main() {
        vPos = position;
        vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vPos;
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      uniform vec3 color;
      uniform float isShingle;

      void main() {
        vec3 n = normalize(vNormal);

        // ── Metal / corrugated barn tin ─────────────────────────────
        // Standard corrugated roofing: ~2.67 ribs/ft (≈4.5-inch spacing).
        // Ribs run parallel to ridge (Z direction), down the slope.
        float ribFreq = 2.67;
        float t = mod(vPos.x * ribFreq, 1.0);

        // Sine-wave corrugation profile: 1 at ridge crown, 0 at valley
        float corrugation = 0.5 + 0.5 * cos(t * 6.28318);

        // Normal perturbation from the derivative of the corrugation profile.
        // Larger factor = deeper-looking ribs.
        float dCorrugation = -sin(t * 6.28318) * 1.1;
        vec3 ribNormal = normalize(n + vec3(dCorrugation, 0.0, 0.0));

        // Ridges ~2× as bright as valleys for clearly visible ribs at a distance
        vec3 metalBase = color * (0.48 + corrugation * 0.52);

        // Lambert diffuse using perturbed rib normal
        vec3 l1dir = normalize(vec3(15.0, 20.0, 10.0) - vWorldPos);
        vec3 l2dir = normalize(vec3(-15.0, 20.0, -10.0) - vWorldPos);
        float diff1 = max(dot(ribNormal, l1dir), 0.0);
        float diff2 = max(dot(ribNormal, l2dir), 0.0);
        float ambient = 0.44;
        float diffuse = ambient + diff1 * 0.42 + diff2 * 0.14;

        // Blinn-Phong specular — concentrated tightly on ridge crowns
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        vec3 halfDir = normalize(l1dir + viewDir);
        float spec = pow(max(dot(ribNormal, halfDir), 0.0), 64.0);
        float metalSpec = spec * corrugation * 2.0;

        vec3 silver = vec3(0.90, 0.93, 0.95);
        vec3 metalColor = metalBase * diffuse + silver * metalSpec * 0.75;

        // ── Shingle path ─────────────────────────────────────────────
        float coursePos = mod(vPos.y * 1.0, 1.0);
        float course = floor(vPos.y * 1.0);
        float stagger = mod(course, 2.0) * 0.5;
        float shinglePos = mod((vPos.x + stagger) / 1.2, 1.0);
        float shadowLine = smoothstep(0.0, 0.15, coursePos);
        float divLine = smoothstep(0.88, 0.95, shinglePos);
        // Shingles also get Lambert diffuse (no specular — matte surface)
        vec3 shingleBase = color * (0.65 + shadowLine * 0.35) * (1.0 - divLine * 0.15);
        vec3 shingleColor = shingleBase * (ambient + diff1 * 0.4 + diff2 * 0.2);

        gl_FragColor = vec4(mix(metalColor, shingleColor, isShingle), 1.0);
      }
    `,
  };
}
