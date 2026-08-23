import { OctagonWindow } from '../shed/openings/OctagonWindow';

export const OctagonWindowPreview = ({
  radius = 0.75,
  trimColor = '#654321',
}) => {
  return <OctagonWindow radius={radius} trimColor={trimColor} />;
};
