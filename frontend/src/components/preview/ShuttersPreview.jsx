import { Shutters } from '../shed/extras/Shutters';

const ZERO_SHED = { width: 0, length: 0, wallHeight: 0 };

export const ShuttersPreview = ({
  width = 2,
  height = 3,
  shutterColor = '#FFFFFF',
}) => {
  const placement = { wall: 'front', normalizedX: 0.5, normalizedY: 0.5, width, height };
  return (
    <Shutters
      placement={placement}
      shedDimensions={ZERO_SHED}
      shutterColor={shutterColor}
    />
  );
};
