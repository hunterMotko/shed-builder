import { BarnDoor } from '../shed/openings/BarnDoor';

const ZERO_SHED = { width: 0, length: 0, wallHeight: 0 };

export const BarnDoorPreview = ({
  width = 6,
  height = 7,
  trimColor = '#654321',
  wallColor = '#D2691E',
}) => {
  const placement = { wall: 'front', normalizedX: 0.5, normalizedY: 0.5, width, height };
  return (
    <BarnDoor
      placement={placement}
      shedDimensions={ZERO_SHED}
      trimColor={trimColor}
      wallColor={wallColor}
    />
  );
};
