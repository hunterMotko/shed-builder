import { useMemo, useEffect } from 'react';
import * as THREE from 'three';

const W      = 12;
const L      = 20;
const WH     = 85 / 12;
const WALL_T = 0.5;
const COLOR  = '#2B5219';

function makeSidingMat(color) {
  return new THREE.ShaderMaterial({
    uniforms: {
      color: { value: new THREE.Color(color) },
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

      void main() {
        // T1-11 vertical grooves
        float rib = mod(vPos.x * 2.0, 1.0);
        float ribEffect = smoothstep(0.4, 0.45, rib) - smoothstep(0.55, 0.6, rib);
        vec3 base = color * (1.0 - ribEffect * 0.12);

        // Lambert diffuse matched to scene lights
        vec3 n  = normalize(vNormal);
        vec3 l1 = normalize(vec3(18.0, 28.0, 14.0) - vWorldPos);
        vec3 l2 = normalize(vec3(-12.0, 16.0, -12.0) - vWorldPos);
        float diff1 = max(dot(n, l1), 0.0);
        float diff2 = max(dot(n, l2), 0.0);
        float light = 0.50 + diff1 * 0.36 + diff2 * 0.14;

        gl_FragColor = vec4(base * light, 1.0);
      }
    `,
    side: THREE.DoubleSide,
  });
}

export function BarnBody() {
  const mat = useMemo(() => makeSidingMat(COLOR), []);
  useEffect(() => () => mat.dispose(), [mat]);

  const halfW = W / 2;
  const halfL = L / 2;

  return (
    <group name="barnBody">
      {/* Left side wall */}
      <mesh
        position={[-(halfW - WALL_T / 2), WH / 2, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[L - WALL_T * 2, WH, WALL_T]} />
        <primitive object={mat} attach="material" />
      </mesh>

      {/* Right side wall */}
      <mesh
        position={[+(halfW - WALL_T / 2), WH / 2, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[L - WALL_T * 2, WH, WALL_T]} />
        <primitive object={mat} attach="material" />
      </mesh>

      {/* Front gable panel — rectangular section floor-to-eave */}
      <mesh position={[0, WH / 2, halfL + 0.01]} castShadow receiveShadow>
        <boxGeometry args={[W, WH, 0.01]} />
        <primitive object={mat} attach="material" />
      </mesh>

      {/* Back gable panel */}
      <mesh position={[0, WH / 2, -(halfL + 0.01)]} castShadow receiveShadow>
        <boxGeometry args={[W, WH, 0.01]} />
        <primitive object={mat} attach="material" />
      </mesh>
    </group>
  );
}
