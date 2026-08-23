import { GarageDoor } from '../shed/openings/GarageDoor';

const ZERO_SHED = { width: 0, length: 0, wallHeight: 0 };

export const GarageDoorPreview = ({
  width = 8,
  height = 7,
  trimColor = '#8B7355',
}) => {
  const placement = { wall: 'front', normalizedX: 0.5, normalizedY: 0.5, width, height };
  return (
    <GarageDoor
      placement={placement}
      shedDimensions={ZERO_SHED}
      trimColor={trimColor}
    />
  );
};
