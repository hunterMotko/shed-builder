import { Skylight } from '../shed/extras/Skylight';

export const SkylightPreview = ({
  runningFt = 8,
  ridgeFt = 16,
  roofColor = '#8B4513',
}) => {
  return <Skylight runningFt={runningFt} ridgeFt={ridgeFt} roofColor={roofColor} />;
};
