import { useMemo } from 'react';
import * as THREE from 'three';

/**
 * One band along a roof edge, extruded from the outline `trimGeometry` hands
 * back — a rake fascia, a Barn's fly, or the J-channel over either.
 *
 * A band is a mitred polygon in the gable-end plane, which is the whole point
 * of `mitredBand`: a box is cut square across its own axis and cannot close a
 * corner. So it is built the way the roof slab itself is, shape then extrude,
 * with the outline's `y` measured from the top of the wall and the extrusion
 * running back along Z.
 *
 * `<extrudeGeometry>` is a React Three Fiber element rather than a
 * `<primitive>`, so the geometry is disposed for us. Memoise the outline in
 * the caller all the same — a fresh array every render rebuilds the shape.
 */
export const ExtrudedBand = ({ outline, position, depth, children }) => {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(outline[0][0], outline[0][1]);
    for (const [x, y] of outline.slice(1)) s.lineTo(x, y);
    s.closePath();
    return s;
  }, [outline]);

  const settings = useMemo(() => ({ depth, bevelEnabled: false }), [depth]);

  return (
    <mesh position={position} castShadow receiveShadow>
      <extrudeGeometry args={[shape, settings]} />
      {children}
    </mesh>
  );
};
