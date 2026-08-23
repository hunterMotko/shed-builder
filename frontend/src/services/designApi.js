/**
 * Design API Service
 *
 * Centralized API layer for shed design persistence.
 * Handles all HTTP communication with the backend API.
 */

import axios from 'axios';

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
 * @param {string} config.style - Shed style ('Barn' or 'Gable')
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
 * Helper function to validate design configuration before saving
 * @param {Object} config - Design configuration to validate
 * @returns {Object} Validation result {isValid: boolean, errors: string[]}
 */
export const validateDesignConfig = (config) => {
	const errors = [];
	// Style validation
	if (!['Barn', 'Gable'].includes(config.style)) {
		errors.push('Style must be either "Barn" or "Gable"');
	}
	// Color validation (basic hex format)
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
	return {
		isValid: errors.length === 0,
		errors,
	};
};
