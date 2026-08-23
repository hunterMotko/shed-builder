import { useMemo, useEffect } from 'react';
import * as THREE from 'three';

const W              = 12;
const L              = 20;
const WH             = 85 / 12;
const OVERHANG       = 0.5;
const KNUCKLE_RATIO  = 0.82;
const LOWER_PITCH    = 12;
const UPPER_PITCH    = 4;
const SIDING_COLOR   = '#2B5219';
const ROOF_COLOR     = '#B8BCB4';

const halfW    = W / 2;
const knuckleX = halfW * KNUCKLE_RATIO;
const run      = halfW + OVERHANG - knuckleX;
const knuckleY = run * (LOWER_PITCH / 12);
const peakY    = knuckleY + knuckleX * (UPPER_PITCH / 12);

function makeSidingMat(color) {
  return new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(color) } },
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
      void main() {
        float rib = mod(vPos.x * 2.0, 1.0);
        float ribEffect = smoothstep(0.4, 0.45, rib) - smoothstep(0.55, 0.6, rib);
        vec3 base = color * (1.0 - ribEffect * 0.12);
        vec3 n  = normalize(vNormal);
        vec3 l1 = normalize(vec3(18.0, 28.0, 14.0) - vWorldPos);
        vec3 l2 = normalize(vec3(-12.0, 16.0, -12.0) - vWorldPos);
        float light = 0.50 + max(dot(n, l1), 0.0) * 0.36 + max(dot(n, l2), 0.0) * 0.14;
        gl_FragColor = vec4(base * light, 1.0);
      }
    `,
    side: THREE.DoubleSide,
  });
}

function makeRoofMat(color) {
  return new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(color) } },
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

      void main() {
        vec3 n = normalize(vNormal);

        // Corrugated roofing: 2.67 ribs/ft (~4.5-inch spacing, standard barn tin)
        float ribFreq = 2.67;
        float t = mod(vPos.x * ribFreq, 1.0);
        float corrugation = 0.5 + 0.5 * cos(t * 6.28318);

        // Perturbed normal for rib shading
        float dCorr = -sin(t * 6.28318) * 1.1;
        vec3 ribN = normalize(n + vec3(dCorr, 0.0, 0.0));

        // Brightness: ridges ~2x valleys
        vec3 metalBase = color * (0.48 + corrugation * 0.52);

        // Lambert diffuse matched to scene lights
        vec3 l1 = normalize(vec3(18.0, 28.0, 14.0) - vWorldPos);
        vec3 l2 = normalize(vec3(-12.0, 16.0, -12.0) - vWorldPos);
        float diff1 = max(dot(ribN, l1), 0.0);
        float diff2 = max(dot(ribN, l2), 0.0);
        float diffuse = 0.44 + diff1 * 0.42 + diff2 * 0.14;

        // Blinn-Phong specular on ridge crowns only
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        vec3 halfDir = normalize(l1 + viewDir);
        float spec = pow(max(dot(ribN, halfDir), 0.0), 64.0);
        float metalSpec = spec * corrugation * 2.0;

        vec3 silver = vec3(0.90, 0.93, 0.95);
        vec3 finalColor = metalBase * diffuse + silver * metalSpec * 0.75;

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `,
    side: THREE.DoubleSide,
  });
}

export function BarnRoof() {
  const sidingMat = useMemo(() => makeSidingMat(SIDING_COLOR), []);
  const roofMat   = useMemo(() => makeRoofMat(ROOF_COLOR), []);

  useEffect(() => () => sidingMat.dispose(), [sidingMat]);
  useEffect(() => () => roofMat.dispose(),   [roofMat]);

  // [front-endcap, back-endcap, slopes]
  const materials = useMemo(
    () => [sidingMat, sidingMat, roofMat],
    [sidingMat, roofMat]
  );

  const lowerShape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-(halfW + OVERHANG), 0);
    s.lineTo(+(halfW + OVERHANG), 0);
    s.lineTo(+knuckleX, knuckleY);
    s.lineTo(-knuckleX, knuckleY);
    s.closePath();
    return s;
  }, []);

  const upperShape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-knuckleX, knuckleY);
    s.lineTo(+knuckleX, knuckleY);
    s.lineTo(0, peakY);
    s.closePath();
    return s;
  }, []);

  const extrudeOpts = useMemo(
    () => ({ depth: L, bevelEnabled: false }),
    []
  );

  const pos = [0, WH, -L / 2];

  return (
    <group name="barnRoof">
      <mesh name="roofLower" position={pos} castShadow receiveShadow>
        <extrudeGeometry args={[lowerShape, extrudeOpts]} />
        <primitive object={materials} attach="material" />
      </mesh>
      <mesh name="roofUpper" position={pos} castShadow receiveShadow>
        <extrudeGeometry args={[upperShape, extrudeOpts]} />
        <primitive object={materials} attach="material" />
      </mesh>
    </group>
  );
}
