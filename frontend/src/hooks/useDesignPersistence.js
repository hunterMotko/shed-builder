/**
 * Design Persistence Hook
 *
 * Custom React hook for managing shed design save/load operations.
 * Provides loading states, error handling, and integration with the shed store.
 */
import { useState } from 'react';
import { useShedStore } from '../store/shedStore';
import { saveDesign, loadDesign, listDesigns, validateDesignConfig } from '../services/designApi';

/**
 * Hook for managing design persistence operations
 * @returns {Object} Persistence methods and state
 */
export const useDesignPersistence = () => {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState(null);
	const [lastSavedId, setLastSavedId] = useState(null);
	const {
		setWidth,
		setLength,
		setWallHeight,
		setModel,
		setColor,
		setRoofColor,
		setTrimColor,
		setTrimColorMode,
		setTrimAutoMode,
		setSidingTexture,
		setRoofMaterial,
		setRoofLowerPitch,
		setRoofUpperPitch,
		setFoundationHeight,
		setFoundationColor,
		setPorch,
		setOption,
		setPrice,
		clearPlacements,
		addPlacement,
		getConfig,
	} = useShedStore();

	/**
	 * Save the current design configuration
	 * @returns {Promise<Object>} Saved design with ID
	 */
	const save = async () => {
		setIsLoading(true);
		setError(null);
		try {
			const config = getConfig();
			// Validate configuration before saving
			const validation = validateDesignConfig(config);
			if (!validation.isValid) {
				throw new Error(validation.errors.join(', '));
			}
			// Save to backend
			const savedDesign = await saveDesign(config);
			setLastSavedId(savedDesign.id);

			return savedDesign;
		} catch (err) {
			const errorMessage = err.userMessage || err.message || 'Failed to save design';
			setError(errorMessage);
			throw err;
		} finally {
			setIsLoading(false);
		}
	};

	/**
	 * Load a design by ID and update the store
	 * @param {string} id - Design ID to load
	 * @returns {Promise<Object>} Loaded design configuration
	 */
	const load = async (id) => {
		if (!id) {
			throw new Error('Design ID is required');
		}
		setIsLoading(true);
		setError(null);
		try {
			const design = await loadDesign(id);
			// Restore all configuration fields from the saved design
			setWidth(design.width);
			setLength(design.length);
			if (design.wallHeight != null) setWallHeight(design.wallHeight);
			setModel(design.model);
			setColor(design.color);
			setRoofColor(design.roofColor);
			setTrimColor(design.trimColor);
			if (design.trimColorMode != null) setTrimColorMode(design.trimColorMode);
			if (design.trimAutoMode != null) setTrimAutoMode(design.trimAutoMode);
			if (design.sidingTexture != null) setSidingTexture(design.sidingTexture);
			if (design.roofMaterial != null) setRoofMaterial(design.roofMaterial);
			if (design.roofLowerPitch != null) setRoofLowerPitch(design.roofLowerPitch);
			if (design.roofUpperPitch != null) setRoofUpperPitch(design.roofUpperPitch);
			if (design.foundationHeight != null) setFoundationHeight(design.foundationHeight);
			if (design.foundationColor != null) setFoundationColor(design.foundationColor);
			if (design.porch != null) setPorch(design.porch);
			if (design.options != null) {
				Object.entries(design.options).forEach(([key, cfg]) => setOption(key, cfg));
			}
			if (design.price != null) setPrice(design.price);
			// Restore placements
			clearPlacements();
			if (Array.isArray(design.placements)) {
				design.placements.forEach(addPlacement);
			}
			setLastSavedId(design.id);
			return design;
		} catch (err) {
			const errorMessage = err.userMessage || err.message || 'Failed to load design';
			setError(errorMessage);
			throw err;
		} finally {
			setIsLoading(false);
		}
	};

	/**
	 * List all available designs
	 * @returns {Promise<Array>} Array of saved designs
	 */
	const list = async () => {
		setIsLoading(true);
		setError(null);
		try {
			const designs = await listDesigns();
			return designs;
		} catch (err) {
			const errorMessage = err.userMessage || err.message || 'Failed to list designs';
			setError(errorMessage);
			throw err;
		} finally {
			setIsLoading(false);
		}
	};
	/**
	 * Clear any error state
	 */
	const clearError = () => {
		setError(null);
	};
	return {
		save,
		load,
		list,
		isLoading,
		error,
		lastSavedId,
		clearError,
	};
};
