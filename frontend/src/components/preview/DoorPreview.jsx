import { DoorObject } from '../common/DoorObject';

const ZERO_SHED = { width: 0, length: 0, wallHeight: 0 };

export const DoorPreview = ({
  width = 3,
  height = 7,
  trimColor = '#654321',
  wallColor = '#8B4513',
}) => {
  const placement = { wall: 'front', normalizedX: 0.5, normalizedY: 0.5, width, height };
  return (
    <DoorObject
      placement={placement}
      shedDimensions={ZERO_SHED}
      trimColor={trimColor}
      wallColor={wallColor}
    />
  );
};
