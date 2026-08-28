import { openingTransform } from '../../../utils/wallOpenings';

// The leaves are built of the wall's own siding and hang IN the opening, their
// faces flush with the wall plane — only the white stiles and rails stand
// proud. Half the slab back from the face puts the slab's front on the siding.
const OFFSET = -0.035; // -slab / 2

// Module-level component — not re-created on each render
function DoorLeaf({ leafW, leafH, isRight, woodColor, trimColor, metalColor }) {
  const stile = 0.28;   // 4in white stiles and rails, measured off the photo
  const slab  = 0.07;
  const frameZ = 0.028;

  // The mid rail sits a little ABOVE centre, and only the section below it is
  // divided. Measured on `barn_barndoors.jpg`: the rail lands 45% of the way
  // down the leaf, and a vertical muntin splits the lower half into two panels
  // — a three-panel door, not a Z-braced carriage door.
  const midY = leafH * 0.04;
  const lowerTop = midY - stile / 2;
  const lowerBottom = -(leafH / 2 - stile);
  const lowerH = Math.max(0.01, lowerTop - lowerBottom);

  const hingeEdgeX = isRight ? leafW / 2 : -leafW / 2;
  const strapDir = isRight ? -1 : 1;
  const hingeYs = [leafH / 2 - 0.35, 0, -(leafH / 2 - 0.35)];

  const frameMat = { color: trimColor, roughness: 0.6, metalness: 0 };
  const z = slab / 2 + frameZ / 2;

  return (
    <group>
      {/* Panel field, in the wall colour — the panels really are siding */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[leafW, leafH, slab]} />
        <meshStandardMaterial color={woodColor} roughness={0.8} metalness={0} />
      </mesh>

      {[
        { key: 'top', pos: [0, leafH / 2 - stile / 2, z], size: [leafW, stile, frameZ] },
        { key: 'bottom', pos: [0, -(leafH / 2 - stile / 2), z], size: [leafW, stile, frameZ] },
        { key: 'hinge-stile', pos: [hingeEdgeX + (strapDir * stile) / 2, 0, z], size: [stile, leafH, frameZ] },
        { key: 'meet-stile', pos: [-(hingeEdgeX + (strapDir * stile) / 2), 0, z], size: [stile, leafH, frameZ] },
        { key: 'mid-rail', pos: [0, midY, z], size: [leafW, stile, frameZ] },
        { key: 'muntin', pos: [0, (lowerTop + lowerBottom) / 2, z], size: [stile, lowerH, frameZ] },
      ].map(({ key, pos, size }) => (
        <mesh key={key} position={pos} castShadow>
          <boxGeometry args={size} />
          <meshStandardMaterial {...frameMat} />
        </mesh>
      ))}

      {/* Hinges: short plates on the outer stile, not the long straps a
          carriage door gets. Three per leaf, as in the photograph. */}
      {hingeYs.map((hy, i) => (
        <mesh key={i} position={[hingeEdgeX + strapDir * 0.09, hy, slab / 2 + 0.02]}>
          <boxGeometry args={[0.17, 0.09, 0.014]} />
          <meshStandardMaterial color={metalColor} roughness={0.38} metalness={0.72} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * SwingBarnDoor — the double doors on the gable end of a Barn.
 *
 * Each leaf is hinged on its outer edge and they meet in the middle. The leaf
 * is a three-panel door: one panel above the mid rail, two below it. It was a
 * Z-braced carriage door, which is a different product and drew a large
 * diagonal across each leaf that is in none of the Reference Photos.
 */
export const SwingBarnDoor = ({
  placement,
  shedDimensions,
  trimColor = '#654321',
  wallColor = '#D2691E',
}) => {
  const leafW = placement.width / 2;
  const leafH = placement.height;
  const { position: pos, rotation: rot } = openingTransform(placement, shedDimensions, OFFSET);

  return (
    <group position={pos} rotation={rot}>
      {/* Left leaf — hinged on left outer edge */}
      <group position={[-leafW / 2, 0, 0]}>
        <DoorLeaf
          leafW={leafW} leafH={leafH}
          isRight={false}
          woodColor={wallColor}
          trimColor={trimColor}
          metalColor="#3a3a3a"
        />
      </group>

      {/* Right leaf — hinged on right outer edge */}
      <group position={[leafW / 2, 0, 0]}>
        <DoorLeaf
          leafW={leafW} leafH={leafH}
          isRight={true}
          woodColor={wallColor}
          trimColor={trimColor}
          metalColor="#3a3a3a"
        />
      </group>

      {/* Drop hasp at center meeting edge */}
      <mesh position={[0, 0, 0.055]}>
        <boxGeometry args={[0.08, 0.18, 0.025]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.35} metalness={0.75} />
      </mesh>
    </group>
  );
};
