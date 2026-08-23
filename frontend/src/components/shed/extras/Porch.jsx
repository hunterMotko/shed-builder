import { useMemo } from 'react';

const POST_SIZE      = 0.333;  // 4×4 post (ft)
const DECK_THICKNESS = 0.2;

/**
 * Porch — deck platform with 4 corner posts.
 * No roof: designed to be recessed under barn-style overhangs.
 */
export const Porch = ({
  shedWidth,
  shedLength,
  wallHeight = 8,
  wall = 'front',
  depth = 6,
  color = '#8B7355',
}) => {
  const halfW = shedWidth / 2;
  const halfL = shedLength / 2;

  const porchSpan = (wall === 'front' || wall === 'back') ? shedWidth : shedLength;
  const halfSpan  = porchSpan / 2;

  const [groupPos, groupRot] = useMemo(() => {
    switch (wall) {
      case 'front': return [[0, 0,  halfL],  [0, 0, 0]];
      case 'back':  return [[0, 0, -halfL],  [0, Math.PI, 0]];
      case 'left':  return [[-halfW, 0, 0],  [0, -Math.PI / 2, 0]];
      case 'right': return [[ halfW, 0, 0],  [0,  Math.PI / 2, 0]];
      default:      return [[0, 0,  halfL],  [0, 0, 0]];
    }
  }, [wall, halfW, halfL]);

  const WOOD = { color, roughness: 0.75, metalness: 0.0 };

  // Post positions: 4 corners of the deck
  const postXs = [-halfSpan + POST_SIZE / 2, halfSpan - POST_SIZE / 2];
  const postZs = [POST_SIZE / 2, depth - POST_SIZE / 2];

  return (
    <group position={groupPos} rotation={groupRot}>
      {/* Deck floor */}
      <mesh position={[0, DECK_THICKNESS / 2, depth / 2]} receiveShadow>
        <boxGeometry args={[porchSpan, DECK_THICKNESS, depth]} />
        <meshStandardMaterial {...WOOD} />
      </mesh>

      {/* 4 corner posts */}
      {postXs.map((px) =>
        postZs.map((pz) => (
          <mesh
            key={`${px}-${pz}`}
            position={[px, wallHeight / 2 + DECK_THICKNESS, pz]}
            castShadow receiveShadow
          >
            <boxGeometry args={[POST_SIZE, wallHeight, POST_SIZE]} />
            <meshStandardMaterial {...WOOD} />
          </mesh>
        ))
      )}
    </group>
  );
};
