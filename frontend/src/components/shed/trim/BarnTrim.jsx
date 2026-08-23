/**
 * BarnTrim — style-specific trim for barn (gambrel) sheds.
 * Renders 4 corner boards only.
 * No eave fascia (covered by roof overhang), no knuckle boards (gambrel break
 * is a roof profile feature, not a side-wall trim board).
 * Only imported by BarnShed — never shared with GableShed.
 */
export const BarnTrim = ({
  shedWidth,
  shedLength,
  wallHeight,
  trimColor,
  trimWidth = 0.333,
}) => {
  const halfW = shedWidth / 2;
  const halfL = shedLength / 2;
  const tw    = trimWidth;

  const TRIM_MAT = { color: trimColor, roughness: 0.45, metalness: 0.1 };

  const corners = [
    [-(halfW - tw / 2),  halfL - tw / 2],
    [+(halfW - tw / 2),  halfL - tw / 2],
    [-(halfW - tw / 2), -(halfL - tw / 2)],
    [+(halfW - tw / 2), -(halfL - tw / 2)],
  ];

  return (
    <group name="barnTrim">
      {corners.map(([cx, cz], i) => (
        <mesh key={`corner-${i}`} position={[cx, wallHeight / 2, cz]} castShadow receiveShadow>
          <boxGeometry args={[tw, wallHeight, tw]} />
          <meshStandardMaterial {...TRIM_MAT} />
        </mesh>
      ))}
    </group>
  );
};
