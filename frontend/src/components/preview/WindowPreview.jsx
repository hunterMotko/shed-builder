import { WindowObject } from '../common/WindowObject';

const ZERO_SHED = { width: 0, length: 0, wallHeight: 0 };

export const WindowPreview = ({
  width = 2,
  height = 3,
  trimColor = '#654321',
}) => {
  const placement = { wall: 'front', normalizedX: 0.5, normalizedY: 0.5, width, height };
  return (
    <WindowObject
      placement={placement}
      shedDimensions={ZERO_SHED}
      trimColor={trimColor}
    />
  );
};
