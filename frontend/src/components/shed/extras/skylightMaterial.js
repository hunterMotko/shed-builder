/**
 * What the glass of a ridge skylight is made of.
 *
 * A skylight is not a part that sits on the roof — it is the length of ridge
 * cap that happens to be glass instead of metal, so its width, its fold down
 * each slope and its place on the ridge all come from `roofRidgeCap` along
 * with the metal either side of it (issue #42). All that is left for this
 * module is the material, and which of the two a run of the ridge gets.
 *
 * It lives apart from `Skylight.jsx` because a module that exports a
 * component may export nothing else and still hot-reload.
 */
export const SKYLIGHT_MATERIAL = {
	color: '#DDEEFF',
	transparent: true,
	opacity: 0.55,
	roughness: 0.08,
	metalness: 0.15,
};

/**
 * The material for one run of the ridge.
 *
 * Anything that is not glass is the roof's own metal, which is why the
 * gambrel's Knuckle flashing can share this map without carrying a `kind`.
 */
export const ridgeMaterial = (kind, metal) =>
	kind === 'glass' ? SKYLIGHT_MATERIAL : metal;
