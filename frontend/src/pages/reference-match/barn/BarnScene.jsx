import { BarnFoundation } from './BarnFoundation';
import { BarnBody }       from './BarnBody';
import { BarnRoof }       from './BarnRoof';
import { BarnTrim }       from './BarnTrim';
import { BarnDoors }      from './BarnDoors';

export function BarnScene() {
  return (
    <group name="barnRefV2">
      <BarnFoundation />
      <BarnBody />
      <BarnRoof />
      <BarnTrim />
      <BarnDoors />
    </group>
  );
}
