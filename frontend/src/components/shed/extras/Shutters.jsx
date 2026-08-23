const SHUTTER_WIDTH = 1.25;  // ft per shutter panel
const SHUTTER_THICK = 0.04;  // ft
const BORDER_W      = 0.06;  // ft frame border width (stiles & rails)
const RAIL_THICK    = 0.07;  // ft mid-rail thickness
const SLAT_H        = 0.036; // ft louver slat height
const SLAT_D        = 0.10;  // ft louver slat depth (gives angled shadow)
const SLAT_ANGLE    = Math.PI / 5; // ~36° tilt
const SLAT_SPACING  = 0.155; // ft between slat centers
const TRIM_OFFSET   = 0.25;  // matches DoorFrame/WindowFrame

// A section of louvered slats between two Y boundaries
function Louvers({ yBottom, yTop, innerW, color }) {
  const sectionH = yTop - yBottom;
  const count    = Math.max(2, Math.round(sectionH / SLAT_SPACING));
  const spacing  = sectionH / (count + 1);

  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const y = yBottom + (i + 1) * spacing;
        return (
          <mesh key={i} position={[0, y, SHUTTER_THICK / 2 + 0.005]} rotation={[SLAT_ANGLE, 0, 0]}>
            <boxGeometry args={[innerW, SLAT_H, SLAT_D]} />
            <meshStandardMaterial color={color} roughness={0.45} />
          </mesh>
        );
      })}
    </>
  );
}

// One shutter panel (with frame border + 3 louvered sections)
function ShutterPanel({ w, h, color }) {
  const innerW = w - BORDER_W * 2;  // width inside the stiles
  // Mid rails divide panel into 3 equal sections
  const rail1Y = h * (-1 / 6);
  const rail2Y = h * (1 / 6);

  return (
    <group>
      {/* Backing board */}
      <mesh>
        <boxGeometry args={[w, h, SHUTTER_THICK]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>

      {/* Left stile (border) */}
      <mesh position={[-(w / 2 - BORDER_W / 2), 0, SHUTTER_THICK / 2 + 0.005]}>
        <boxGeometry args={[BORDER_W, h, 0.012]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      {/* Right stile */}
      <mesh position={[(w / 2 - BORDER_W / 2), 0, SHUTTER_THICK / 2 + 0.005]}>
        <boxGeometry args={[BORDER_W, h, 0.012]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      {/* Top rail */}
      <mesh position={[0, h / 2 - BORDER_W / 2, SHUTTER_THICK / 2 + 0.005]}>
        <boxGeometry args={[w, BORDER_W, 0.012]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      {/* Bottom rail */}
      <mesh position={[0, -(h / 2 - BORDER_W / 2), SHUTTER_THICK / 2 + 0.005]}>
        <boxGeometry args={[w, BORDER_W, 0.012]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>

      {/* Mid rails dividing the 3 louver sections */}
      <mesh position={[0, rail1Y, SHUTTER_THICK / 2 + 0.005]}>
        <boxGeometry args={[w, RAIL_THICK, 0.012]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      <mesh position={[0, rail2Y, SHUTTER_THICK / 2 + 0.005]}>
        <boxGeometry args={[w, RAIL_THICK, 0.012]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>

      {/* Louver slats in each section (within stile borders, between rails) */}
      <Louvers yBottom={-(h / 2) + BORDER_W} yTop={rail1Y - RAIL_THICK / 2} innerW={innerW} color={color} />
      <Louvers yBottom={rail1Y + RAIL_THICK / 2} yTop={rail2Y - RAIL_THICK / 2} innerW={innerW} color={color} />
      <Louvers yBottom={rail2Y + RAIL_THICK / 2} yTop={h / 2 - BORDER_W} innerW={innerW} color={color} />
    </group>
  );
}

/**
 * Shutters — louvered vinyl panel shutters flanking a window opening.
 */
export const Shutters = ({
  placement,
  shedDimensions,
  shutterColor = '#FFFFFF',
}) => {
  const { wall, normalizedX, normalizedY, width: elemWidth, height: elemHeight } = placement;
  const { width, length, wallHeight } = shedDimensions;
  const halfWidth  = width / 2;
  const halfLength = length / 2;

  let pos, rot;
  switch (wall) {
    case 'front':
      pos = [-halfWidth + normalizedX * width, -wallHeight / 2 + normalizedY * wallHeight, halfLength + TRIM_OFFSET];
      rot = [0, 0, 0];
      break;
    case 'back':
      pos = [-halfWidth + normalizedX * width, -wallHeight / 2 + normalizedY * wallHeight, -halfLength - TRIM_OFFSET];
      rot = [0, 0, 0];
      break;
    case 'left':
      pos = [-halfWidth - TRIM_OFFSET, -wallHeight / 2 + normalizedY * wallHeight, -halfLength + normalizedX * length];
      rot = [0, Math.PI / 2, 0];
      break;
    case 'right':
      pos = [halfWidth + TRIM_OFFSET, -wallHeight / 2 + normalizedY * wallHeight, -halfLength + normalizedX * length];
      rot = [0, Math.PI / 2, 0];
      break;
    default:
      pos = [0, 0, 0];
      rot = [0, 0, 0];
  }

  const leftX  = -(elemWidth / 2 + SHUTTER_WIDTH / 2 + 0.04);
  const rightX =  (elemWidth / 2 + SHUTTER_WIDTH / 2 + 0.04);

  return (
    <group position={pos} rotation={rot}>
      <group position={[leftX, 0, 0]}>
        <ShutterPanel w={SHUTTER_WIDTH} h={elemHeight} color={shutterColor} />
      </group>
      <group position={[rightX, 0, 0]}>
        <ShutterPanel w={SHUTTER_WIDTH} h={elemHeight} color={shutterColor} />
      </group>
    </group>
  );
};
