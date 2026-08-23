import { Skylight } from '../shed/extras/Skylight';

export const SkylightPreview = ({
  runningFt = 8,
  numPanels = 4,
}) => {
  return <Skylight runningFt={runningFt} numPanels={numPanels} />;
};
