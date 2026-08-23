const SIDING  = '#2B5219';
const TRIM    = '#FFFFFF';
const METAL   = '#222222';

const DOOR_W  = 6;
const DOOR_H  = 6.5;
const BW      = 0.125;   // 1.5" board width in ft
const SLAB_D  = 0.10;
const BOARD_Z = SLAB_D / 2 + 0.015;
const HALF_L  = 10;

function DoorLeaf({ x, isRight }) {
  const halfLeafW = DOOR_W / 4;   // 1.5 ft
  const halfLeafH = DOOR_H / 2;   // 3.25 ft
  const dir       = isRight ? 1 : -1;

  const railY     = -halfLeafH + DOOR_H * 0.60;  // mid-rail at 60% up = +0.65
  const hingeX    =  dir * halfLeafW;
  const hingeYs   = [halfLeafH - 0.3, 0, -halfLeafH + 0.3];

  // Z-brace: single diagonal from bottom-corner to mid-rail-corner on hinge side
  const diagW   = halfLeafW * 2;
  const diagH   = DOOR_H * 0.60 - BW;
  const diagLen = Math.sqrt(diagW * diagW + diagH * diagH);
  const diagAng = isRight ? -Math.atan2(diagH, diagW) : Math.atan2(diagH, diagW);
  const diagCX  = isRight ? 0 : 0;
  const diagCY  = -halfLeafH + BW + diagH / 2;

  return (
    <group position={[x, 0, 0]}>
      {/* Slab */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[halfLeafW * 2, DOOR_H, SLAB_D]} />
        <meshStandardMaterial color={SIDING} roughness={0.80} />
      </mesh>

      {/* Top rail */}
      <mesh position={[0, halfLeafH - BW / 2, BOARD_Z]} castShadow>
        <boxGeometry args={[halfLeafW * 2, BW, 0.025]} />
        <meshStandardMaterial color={TRIM} roughness={0.50} />
      </mesh>

      {/* Bottom rail */}
      <mesh position={[0, -halfLeafH + BW / 2, BOARD_Z]} castShadow>
        <boxGeometry args={[halfLeafW * 2, BW, 0.025]} />
        <meshStandardMaterial color={TRIM} roughness={0.50} />
      </mesh>

      {/* Hinge stile (outer edge) */}
      <mesh position={[hingeX - dir * BW / 2, 0, BOARD_Z]} castShadow>
        <boxGeometry args={[BW, DOOR_H, 0.025]} />
        <meshStandardMaterial color={TRIM} roughness={0.50} />
      </mesh>

      {/* Meeting stile (inner edge) */}
      <mesh position={[-hingeX + dir * BW / 2, 0, BOARD_Z]} castShadow>
        <boxGeometry args={[BW, DOOR_H, 0.025]} />
        <meshStandardMaterial color={TRIM} roughness={0.50} />
      </mesh>

      {/* Horizontal mid-rail */}
      <mesh position={[0, railY, BOARD_Z]} castShadow>
        <boxGeometry args={[halfLeafW * 2, BW, 0.025]} />
        <meshStandardMaterial color={TRIM} roughness={0.50} />
      </mesh>

      {/* Z-brace — single diagonal per leaf */}
      <mesh position={[diagCX, diagCY, BOARD_Z + 0.008]} rotation={[0, 0, diagAng]} castShadow>
        <boxGeometry args={[diagLen, 0.038, 0.018]} />
        <meshStandardMaterial color={TRIM} roughness={0.55} />
      </mesh>

      {/* Strap hinges */}
      {hingeYs.map((hy, i) => (
        <group key={i} position={[hingeX, hy, SLAB_D / 2 + 0.015]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.022, 0.022, 0.06, 8]} />
            <meshStandardMaterial color={METAL} roughness={0.3} metalness={0.8} />
          </mesh>
          <mesh position={[-dir * 0.16, 0, 0]}>
            <boxGeometry args={[0.32, 0.048, 0.012]} />
            <meshStandardMaterial color={METAL} roughness={0.3} metalness={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function BarnDoors() {
  const tw = 0.25;

  return (
    // Group origin: door bottom at world Y=0, face flush with front wall
    <group position={[0, DOOR_H / 2, HALF_L + 0.12]}>
      <DoorLeaf x={-DOOR_W / 4} isRight={false} />
      <DoorLeaf x={+DOOR_W / 4} isRight={true}  />

      {/* Center drop-hasp */}
      <mesh position={[0, 0, SLAB_D / 2 + 0.025]} castShadow>
        <boxGeometry args={[0.07, 0.16, 0.022]} />
        <meshStandardMaterial color={METAL} roughness={0.3} metalness={0.8} />
      </mesh>

      {/* Door frame: left jamb, right jamb, header */}
      <mesh position={[-(DOOR_W / 2 + tw / 2), 0, -0.02]} castShadow receiveShadow>
        <boxGeometry args={[tw, DOOR_H + tw * 2, tw]} />
        <meshStandardMaterial color={TRIM} roughness={0.4} />
      </mesh>
      <mesh position={[+(DOOR_W / 2 + tw / 2), 0, -0.02]} castShadow receiveShadow>
        <boxGeometry args={[tw, DOOR_H + tw * 2, tw]} />
        <meshStandardMaterial color={TRIM} roughness={0.4} />
      </mesh>
      <mesh position={[0, DOOR_H / 2 + tw / 2, -0.02]} castShadow receiveShadow>
        <boxGeometry args={[DOOR_W + tw * 2, tw, tw]} />
        <meshStandardMaterial color={TRIM} roughness={0.4} />
      </mesh>
    </group>
  );
}
