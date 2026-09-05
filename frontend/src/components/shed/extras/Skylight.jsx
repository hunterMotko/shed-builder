import { roofRidgeCap } from '../../../utils/trimGeometry';
import { ridgeMaterial } from './skylightMaterial';

/**
 * Skylight — a length of ridge with the skylight in it, for the Component
 * Preview page. It shows the cap either side, because the cap breaking is
 * the whole of what a skylight does.
 *
 * The product does not mount this: `GableRoof` and `GambrelRoof` render the
 * glass straight from their own `roofRidgeCap` call, so there is one ridge
 * and the glass fills exactly the run the metal gave up (issue #42). This
 * used to be four opaque boxes drawn flat on top of an unbroken cap, at a
 * width and angle of their own invention — a decal over solid roofing.
 */
export const Skylight = ({ runningFt = 8, ridgeFt = 16, roofColor = '#8B4513' }) => {
  const metal = { color: roofColor, roughness: 0.35, metalness: 0.4 };
  const runs = roofRidgeCap(0, 0.5, ridgeFt, 0, { overhang: 0, skylightFt: runningFt });

  return (
    <group name="skylight">
      {runs.map(({ id, kind, position, size, rotation }) => (
        <mesh key={id} position={position} rotation={rotation} castShadow={kind !== 'glass'}>
          <boxGeometry args={size} />
          <meshStandardMaterial {...ridgeMaterial(kind, metal)} />
        </mesh>
      ))}
    </group>
  );
};
