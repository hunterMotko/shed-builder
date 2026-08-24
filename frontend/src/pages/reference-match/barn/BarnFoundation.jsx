const RUNNER_SIZE = 0.333;
const RUNNER_COLOR = '#6B4C2A';
const DECK_COLOR = '#C8A96E';

const RUNNER_XS = [-6, -3, 0, 3, 6];

export function BarnFoundation({ width = 12, length = 20 }) {
  return (
    <group name="barnFoundation">
      {/* Floor deck */}
      <mesh position={[0, -0.0625, 0]} receiveShadow>
        <boxGeometry args={[width, 0.125, length]} />
        <meshStandardMaterial color={DECK_COLOR} roughness={0.85} />
      </mesh>

      {/* Pressure-treated runners */}
      {RUNNER_XS.map((x) => (
        <mesh key={x} position={[x, -(RUNNER_SIZE / 2 + 0.125), 0]} castShadow receiveShadow>
          <boxGeometry args={[RUNNER_SIZE, RUNNER_SIZE, length]} />
          <meshStandardMaterial color={RUNNER_COLOR} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}
