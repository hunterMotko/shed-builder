import { useMemo } from 'react';
import { openingTransform } from '../../utils/wallOpenings';

export const DoorObject = ({
  placement,
  shedDimensions,
  trimColor = '#654321',
  wallColor = '#8B4513',
}) => {
  const { width: elemWidth, height: elemHeight } = placement;

  // Door slab sits 0.3 ft proud of the wall face.
  const { position, rotation } = useMemo(
    () => openingTransform(placement, shedDimensions, 0.3),
    [placement, shedDimensions]
  );

  const W = elemWidth;
  const H = elemHeight;
  const slab      = 0.09;   // door thickness
  const stileW    = 0.15;   // frame stile/rail width
  const botRailH  = 0.22;   // bottom rail (taller for kick plate look)
  const midRailH  = 0.12;   // middle rail that divides upper/lower panels
  const frameZ    = 0.025;  // how proud the trim frame sits above slab

  // Mid rail slightly above vertical center (represents ~42" lock rail on a 7ft door)
  const midRailY = H * 0.09;

  // 3 hinge positions: top, middle, bottom
  const hingeYs = [H / 2 - 0.3, midRailY, -(H / 2 - 0.3)];

  return (
    <group position={position} rotation={rotation}>
      {/* ── Main door slab (door body color) ── */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[W, H, slab]} />
        <meshStandardMaterial color={wallColor} roughness={0.65} metalness={0.02} />
      </mesh>

      {/* ── Raised trim frame members ── */}
      {/* Top rail */}
      <mesh position={[0, H / 2 - stileW / 2, slab / 2 + frameZ / 2]} castShadow>
        <boxGeometry args={[W, stileW, frameZ]} />
        <meshStandardMaterial color={trimColor} roughness={0.5} />
      </mesh>
      {/* Bottom rail */}
      <mesh position={[0, -(H / 2 - botRailH / 2), slab / 2 + frameZ / 2]} castShadow>
        <boxGeometry args={[W, botRailH, frameZ]} />
        <meshStandardMaterial color={trimColor} roughness={0.5} />
      </mesh>
      {/* Middle rail */}
      <mesh position={[0, midRailY, slab / 2 + frameZ / 2]} castShadow>
        <boxGeometry args={[W, midRailH, frameZ]} />
        <meshStandardMaterial color={trimColor} roughness={0.5} />
      </mesh>
      {/* Left stile */}
      <mesh position={[-(W / 2 - stileW / 2), 0, slab / 2 + frameZ / 2]} castShadow>
        <boxGeometry args={[stileW, H, frameZ]} />
        <meshStandardMaterial color={trimColor} roughness={0.5} />
      </mesh>
      {/* Right stile */}
      <mesh position={[(W / 2 - stileW / 2), 0, slab / 2 + frameZ / 2]} castShadow>
        <boxGeometry args={[stileW, H, frameZ]} />
        <meshStandardMaterial color={trimColor} roughness={0.5} />
      </mesh>

      {/* ── Door knob (right side, between mid and bottom rail) ── */}
      {/* Backplate */}
      <mesh position={[W / 2 - stileW / 2, midRailY - 0.55, slab / 2 + 0.018]}>
        <cylinderGeometry args={[0.038, 0.038, 0.018, 12]} />
        <meshStandardMaterial color="#C0A030" metalness={0.85} roughness={0.15} />
      </mesh>
      {/* Knob sphere */}
      <mesh position={[W / 2 - stileW / 2, midRailY - 0.55, slab / 2 + 0.055]}>
        <sphereGeometry args={[0.05, 12, 8]} />
        <meshStandardMaterial color="#C0A030" metalness={0.85} roughness={0.15} />
      </mesh>

      {/* ── 3 hinges on left stile ── */}
      {hingeYs.map((hy, i) => (
        <mesh key={i} position={[-(W / 2 - stileW / 2), hy, slab / 2 + 0.01]}>
          <boxGeometry args={[stileW - 0.02, 0.09, 0.02]} />
          <meshStandardMaterial color="#888" metalness={0.72} roughness={0.28} />
        </mesh>
      ))}
    </group>
  );
};
