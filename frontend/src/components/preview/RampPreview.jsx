import { Ramp } from '../shed/extras/Ramp';

export const RampPreview = ({ size = 'small' }) => {
  // zero shed dims so ramp group origin is at world origin; ramp extends in +Z
  return <Ramp shedWidth={0} shedLength={0} wallHeight={0} wall="front" size={size} />;
};
