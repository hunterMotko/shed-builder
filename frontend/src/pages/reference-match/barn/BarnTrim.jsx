const W  = 12;
const L  = 20;
const WH = 85 / 12;

const tw      = 0.333;
const halfW   = W / 2;
const halfL   = L / 2;
const TRIM_MAT = { color: '#FFFFFF', roughness: 0.45, metalness: 0.05 };

const CORNERS = [
  [-(halfW - tw / 2),  halfL - tw / 2],
  [+(halfW - tw / 2),  halfL - tw / 2],
  [-(halfW - tw / 2), -(halfL - tw / 2)],
  [+(halfW - tw / 2), -(halfL - tw / 2)],
];

export function BarnTrim() {
  return (
    <group name="barnTrim">
      {/* Corner boards — Y=0 to Y=WH */}
      {CORNERS.map(([cx, cz], i) => (
        <mesh key={i} position={[cx, WH / 2, cz]} castShadow receiveShadow>
          <boxGeometry args={[tw, WH, tw]} />
          <meshStandardMaterial {...TRIM_MAT} />
        </mesh>
      ))}

      {/* Eave trim — horizontal strip at top of each side wall */}
      <mesh position={[-(halfW - tw / 2), WH + tw / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[tw, tw, L + 1]} />
        <meshStandardMaterial {...TRIM_MAT} />
      </mesh>
      <mesh position={[+(halfW - tw / 2), WH + tw / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[tw, tw, L + 1]} />
        <meshStandardMaterial {...TRIM_MAT} />
      </mesh>
    </group>
  );
}
