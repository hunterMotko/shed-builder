import { Porch } from '../shed/extras/Porch';

export const PorchPreview = ({
  shedWidth = 12,
  depth = 6,
  color = '#8B7355',
}) => (
  <Porch
    shedWidth={shedWidth}
    shedLength={12}
    wallHeight={8}
    wall="front"
    depth={depth}
    color={color}
  />
);
