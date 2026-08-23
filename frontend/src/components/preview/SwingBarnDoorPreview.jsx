import { SwingBarnDoor } from '../shed/openings/SwingBarnDoor';

const ZERO_SHED = { width: 0, length: 0, wallHeight: 0 };

export const SwingBarnDoorPreview = ({
  width = 6,
  height = 7,
  trimColor = '#654321',
  wallColor = '#D2691E',
}) => {
  const placement = { wall: 'front', normalizedX: 0.5, normalizedY: 0.5, width, height };
  return (
    <SwingBarnDoor
      placement={placement}
      shedDimensions={ZERO_SHED}
      trimColor={trimColor}
      wallColor={wallColor}
    />
  );
};
