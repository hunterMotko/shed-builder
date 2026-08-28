import { SHED_LIGHTING } from '../../utils/shaders';

/**
 * ShedLights — the one light rig every shed is shown under.
 *
 * The siding and roof shaders bake their own Lambert term against
 * `SHED_LIGHTING`, so a scene that lights the shed from anywhere else lights
 * only half of it: the trim boards, doors and windows move and the wall they
 * are nailed to does not. Both pages mount this rather than writing their own
 * lights, which is what they used to do — and they disagreed.
 *
 * These are `directionalLight`s, not the `pointLight`s that were here.
 * Three's point lights have physical falloff, so a light 25 units from the shed
 * with `intensity={1}` arrives at about 1/625 of that — which is why the trim
 * rendered black while the siding, lit by its own baked rig, did not.
 */
export const ShedLights = ({ castShadow = false }) => (
	<>
		<ambientLight intensity={SHED_LIGHTING.sceneAmbient} />
		<directionalLight
			position={SHED_LIGHTING.keyPosition}
			intensity={SHED_LIGHTING.sceneKey}
			castShadow={castShadow}
			shadow-mapSize-width={2048}
			shadow-mapSize-height={2048}
		/>
		<directionalLight
			position={SHED_LIGHTING.fillPosition}
			intensity={SHED_LIGHTING.sceneFill}
		/>
	</>
);
