/**
 * Design API Service
 *
 * Centralized API layer for shed design persistence.
 * Handles all HTTP communication with the backend API.
 */

import axios from 'axios';
import { isValidCombo, isSoldAsTier, tiersForModel, TIERS } from '../utils/pricingUtils';
import { WALL_SIDES } from '../utils/wallSides';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

// Create axios instance with default config
const apiClient = axios.create({
	baseURL: API_BASE_URL,
	headers: {
		'Content-Type': 'application/json',
	},
	timeout: 10000, // 10 second timeout
});

// Response interceptor for consistent error handling
apiClient.interceptors.response.use(
	(response) => response,
	(error) => {
		// Log errors for debugging
		console.error('API Error:', error);
		// Enhance error with user-friendly message
		if (error.response) {
			// Server responded with error status
			error.userMessage = `Server error: ${error.response.status}`;
		} else if (error.request) {
			// Request made but no response received
			error.userMessage = 'Network error: Unable to reach server';
		} else {
			// Something else happened
			error.userMessage = error.message || 'An unexpected error occurred';
		}
		return Promise.reject(error);
	}
);

/**
 * Save a shed design configuration
 * @param {Object} config - Design configuration object
 * @param {number} config.width - Shed width in feet
 * @param {number} config.length - Shed length in feet
 * @param {string} config.model - Shed Model ('Barn' or 'Gable')
 * @param {string} config.color - Shed color (hex)
 * @param {string} config.roofColor - Roof color (hex)
 * @param {string} config.trimColor - Trim color (hex)
 * @param {Array} config.placements - Door/window placements
 * @param {number} config.price - Total price
 * @returns {Promise<Object>} Saved design with generated ID
 */
export const saveDesign = async (config) => {
	const response = await apiClient.post('/save-design', config);
	return response.data;
};

/**
 * Load a saved design by ID
 * @param {string} id - Design ID (UUID)
 * @returns {Promise<Object>} Design configuration
 */
export const loadDesign = async (id) => {
	const response = await apiClient.get(`/design/${id}`);
	return response.data;
};

/**
 * List all saved designs
 * @returns {Promise<Array>} Array of all saved designs
 */
export const listDesigns = async () => {
	const response = await apiClient.get('/designs');
	return response.data;
};

/**
 * The gate `useDesignPersistence.save()` runs before POSTing a Design.
 *
 * This is the only validation a Placement gets. The server checks the
 * combination and the Model and then stores whatever `placements` array it
 * was handed, so this check must not be the weaker of the two (issue #19).
 *
 * The hazard is a non-finite coordinate. `JSON.stringify(NaN)` is `"null"`,
 * so such a Placement saves clean and comes back on load as an Opening whose
 * cut box is at `null` — a wall that silently fails to cut its hole, or that
 * throws inside the evaluator and logs to a console nobody is reading.
 *
 * What this deliberately does not check:
 * - **whether an Opening fits its wall.** `validatePlacement` in
 *   `utils/placementValidator.js` owns that, and it is a different question:
 *   this asks whether the data is well-formed, that asks whether the shed is
 *   buildable. Duplicating it here would give two answers to one question.
 * - **`price`.** The server recomputes it and ignores whatever the client
 *   sent (ADR-0008), so there is nothing here worth guarding.
 *
 * Every problem is reported, not just the first: a customer fixing one field
 * at a time because the gate only ever names one is worse than a long list.
 *
 * @param {Object} config - Design configuration to validate
 * @returns {{isValid: boolean, errors: string[]}}
 */
/**
 * The subset of a design the geometry kernel will refuse outright.
 *
 * Narrower than [validateDesignConfig] on purpose. That one gates a design on
 * the way **out** and may reject a record for things a saved design can survive
 * without — an absent `tier`, say, which `load` explicitly tolerates. Running
 * the save gate on the way in would reject designs that open fine today.
 *
 * This one names only what cannot be drawn. The kernel refuses three
 * unrecognised names rather than guessing at them — an unknown Model, an
 * unknown wall, an octagon fitted to an end nobody named — because upstream's
 * guesses were all answers that look right: the Gable spec for any Model, an
 * Opening through the middle of the shed for any wall, the front gable for any
 * `ends`. A Barn priced as a Gable is worse than a refusal.
 *
 * The catch is *where* the refusal lands. The kernel is load-bearing for first
 * paint, so a bad Model reaching the store throws during render and blanks the
 * canvas. Checking here turns that into the load error the UI already shows.
 *
 * @param {Object} config
 * @returns {string[]} reasons it cannot be drawn; empty when it can
 */
export const unrenderableReasons = (config) => {
	const reasons = [];

	if (!['Barn', 'Gable'].includes(config?.model)) {
		reasons.push(`names a model this configurator does not build: ${config?.model}`);
	}

	if (Array.isArray(config?.placements)) {
		for (const [i, placement] of config.placements.entries()) {
			if (!WALL_SIDES.includes(placement?.wall)) {
				const where = placement?.id ?? `index ${i}`;
				reasons.push(`puts ${where} on a wall the shed does not have: ${placement?.wall}`);
			}
		}
	}

	// An octagon is bought per gable end. `undefined` is the one end on the
	// front — what ticking a box once means, and the reading that cannot
	// overcharge. Anything else is billed for and built on an end nobody named.
	for (const name of ['octagonWindow', 'octagonVent']) {
		const ends = config?.options?.[name]?.ends;
		if (ends !== undefined && !['front', 'back', 'both'].includes(ends)) {
			reasons.push(`fits the ${name} to an end that does not exist: ${ends}`);
		}
	}

	return reasons;
};

export const validateDesignConfig = (config) => {
	const errors = [];

	if (!['Barn', 'Gable'].includes(config.model)) {
		errors.push('Model must be either "Barn" or "Gable"');
	}

	// Colours are optional; an invalid one is not.
	const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
	if (config.color && !hexColorRegex.test(config.color)) {
		errors.push('Invalid shed color format');
	}
	if (config.roofColor && !hexColorRegex.test(config.roofColor)) {
		errors.push('Invalid roof color format');
	}
	if (config.trimColor && !hexColorRegex.test(config.trimColor)) {
		errors.push('Invalid trim color format');
	}

	// The catalog is a fixed list of combinations, not a formula, so a size
	// outside it has no price to quote — check it before asking about it.
	if (!Number.isFinite(config.width) || !Number.isFinite(config.length)) {
		errors.push('Width and length must both be numbers');
	} else if (!TIERS.includes(config.tier)) {
		errors.push(`Tier must be one of ${TIERS.join(' or ')}`);
	} else if (!isValidCombo(config.width, config.length, config.tier)) {
		errors.push(
			`The catalog does not sell ${config.width}x${config.length} as ${config.tier}`
		);
	} else if (config.model && !isSoldAsTier(config.model, config.tier)) {
		// The price table is not keyed by Model, so a size can be in it and the
		// shed still not be sold: `12x16xStandard` is a real price, for a Barn.
		errors.push(
			`A ${config.model} is sold as ${tiersForModel(config.model).join(' or ')} only`
		);
	}

	if (config.placements !== undefined && !Array.isArray(config.placements)) {
		errors.push('Placements must be an array');
	} else if (Array.isArray(config.placements)) {
		config.placements.forEach((placement, i) => {
			const where = placement?.id ?? `index ${i}`;
			for (const axis of ['normalizedX', 'normalizedY']) {
				const value = placement?.[axis];
				if (!Number.isFinite(value)) {
					errors.push(`Placement ${where} has a non-finite ${axis}`);
				} else if (value < 0 || value > 1) {
					errors.push(`Placement ${where} has ${axis} outside its wall`);
				}
			}
			for (const dimension of ['width', 'height']) {
				const value = placement?.[dimension];
				if (!Number.isFinite(value) || value <= 0) {
					errors.push(`Placement ${where} has an invalid ${dimension}`);
				}
			}
			if (!WALL_SIDES.includes(placement?.wall)) {
				errors.push(`Placement ${where} names a wall the shed does not have`);
			}
		});
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
};
