import { create } from 'zustand';
import { calculateTotalPrice, snapToValidCombo } from '../utils/pricingUtils';
import { GAMBREL_LOWER_PITCH, GAMBREL_UPPER_PITCH } from '../utils/roofGeometry';

/**
 * Placement represents a door or window on the shed
 * @typedef {Object} Placement
 * @property {string} id - Unique identifier (UUID)
 * @property {'door' | 'window'} type - Type of opening
 * @property {'front' | 'back' | 'left' | 'right'} wall - Wall location
 * @property {number} normalizedX - 0.0 to 1.0, position on wall width
 * @property {number} normalizedY - 0.0 to 1.0, position on wall height
 * @property {number} width - Width in feet
 * @property {number} height - Height in feet
 * @property {number} rotationZ - Optional rotation in radians (default: 0)
 */
export const useShedStore = create((set) => ({
	// Configuration state — the smallest Gable the catalog sells.
	width: 12,
	length: 16,
	// Tier, not a height. Every catalog size is 11ft to the peak now, so the
	// height stopped telling the two grades apart and Tier does it instead.
	// The geometry's wall height comes from the Model (utils/modelSpec.js).
	//
	// Deluxe because the Model is a Gable and a Gable is sold as a Deluxe only.
	// This used to open on a Standard Gable — a shed that is not in the catalog,
	// quoted at a Barn's price and, since the grade became geometry, drawn with
	// a Barn's 4in roof edge.
	tier: 'Deluxe',
	model: 'Gable',
	color: '#D2691E',
	roofColor: '#8B4513',
	// Trim and Detail Configuration
	trimColor: '#654321',
	trimColorMode: 'automatic', // 'automatic' or 'manual'
	trimAutoMode: 'matchRoof', // 'matchRoof' or 'contrast'
	// Material and Texture Configuration
	sidingTexture: 'T1-11', // 'T1-11', 'smooth'
	roofMaterial: 'metal', // 'metal', 'shingle'
	// Gambrel Roof Configuration (when model === 'Barn')
	// The Barn's gambrel. The Knuckle is not stored — it follows from these two
	// (see gambrelKnuckleRatio), so a steeper side also shortens the side and
	// lengthens the top, which is how the roof was corrected against the photos.
	roofLowerPitch: GAMBREL_LOWER_PITCH, // 20:12 (~59°) — the steep side slope
	roofUpperPitch: GAMBREL_UPPER_PITCH, //  4:12 (~18°) — shallow, at the ridge
	// Foundation Configuration
	foundationHeight: 1.5, // feet
	foundationColor: '#8B7355', // brown/tan concrete/timber appearance
	// Porch configuration
	porch: {
		enabled: false,
		wall: 'front',   // 'front' | 'back' | 'left' | 'right'
		depth: 6,        // feet the porch extends from the wall
	},
	// Add-on options (all disabled by default)
	options: {
		garageDoor:     { enabled: false, size: '8x7', style: 'sectional' },
		additionalDoor: { enabled: false, size: '6x7' },
		entryDoor:      { enabled: false, type: 'steel' }, // 'steel' | 'nine_light'
		vinylWindows:   { enabled: false, count: 1, windowSize: '2x2' },
		octagonWindow:  { enabled: false, ends: 'front' }, // 'front' | 'back' | 'both'
		skylight:       { enabled: false, runningFt: 8 },
		shutters:       { enabled: false, pairs: 1 },
		ramp:           { enabled: false, size: 'small' }, // 'small' | 'large'
		octagonVent:    { enabled: false, ends: 'front' },
	},
	// Calculated state
	price: 0,
	// Door & Window placement state
	// type: 'door' | 'window' | 'garage_door' | 'barn_door'
	placements: [],
	// Configuration Actions
	setWidth: (width) => set((s) => snapToValidCombo(width, s.length, s.tier, s.model)),
	setLength: (length) => set((s) => snapToValidCombo(s.width, length, s.tier, s.model)),
	setTier: (tier) => set((s) => snapToValidCombo(s.width, s.length, tier, s.model)),
	// Changing the Model can change the grade, because a Gable is sold as a
	// Deluxe only: switching a Standard Barn to a Gable has to move it up a
	// grade rather than leave it on a combination the catalog does not sell.
	// Every Standard size is also sold as a Deluxe, so it keeps its size.
	setModel: (model) => set((s) => ({
		model,
		...snapToValidCombo(s.width, s.length, s.tier, model),
		options: {
			...s.options,
			garageDoor: {
				...s.options.garageDoor,
				style: model === 'Barn' ? 'rollup' : 'sectional',
			},
		},
	})),
	setColor: (color) => set({ color }),
	setRoofColor: (roofColor) => set({ roofColor }),
	setTrimColor: (trimColor) => set({ trimColor }),
	setTrimColorMode: (trimColorMode) => set({ trimColorMode }),
	setTrimAutoMode: (trimAutoMode) => set({ trimAutoMode }),
	setSidingTexture: (sidingTexture) => set({ sidingTexture }),
	setRoofMaterial: (roofMaterial) => set({ roofMaterial }),
	setPrice: (price) => set({ price }),
	setRoofLowerPitch: (v) => set({ roofLowerPitch: Math.max(1, Math.min(v, 36)) }),
	setRoofUpperPitch: (v) => set({ roofUpperPitch: Math.max(1, Math.min(v, 18)) }),
	setFoundationHeight: (foundationHeight) => set({ foundationHeight }),
	setFoundationColor: (foundationColor) => set({ foundationColor }),
	setOption: (key, config) => set((state) => ({
		options: {
			...state.options,
			[key]: { ...state.options[key], ...config },
		},
	})),
	setPorch: (porchConfig) => set((state) => ({
		porch: {
			...state.porch,
			...porchConfig,
			depth: porchConfig.depth != null ? Math.max(1, porchConfig.depth) : state.porch.depth,
		},
	})),

	// Placement Management Actions
	addPlacement: (placement) => set((state) => ({
		placements: [...state.placements, placement],
	})),
	removePlacement: (id) => set((state) => ({
		placements: state.placements.filter((p) => p.id !== id),
	})),
	updatePlacement: (id, updates) => set((state) => ({
		placements: state.placements.map((p) =>
			p.id === id ? { ...p, ...updates } : p
		),
	})),
	clearPlacements: () => set({ placements: [] }),
	// Placement Getters
	getPlacements: (wall) => {
		const state = useShedStore.getState();
		return wall
			? state.placements.filter((p) => p.wall === wall)
			: state.placements;
	},
	// Configuration reset (includes placements)
	reset: () => set({
		width: 12,
		length: 16,
		// A Gable is Deluxe only — see the initial state.
		tier: 'Deluxe',
		model: 'Gable',
		color: '#D2691E',
		roofColor: '#8B4513',
		trimColor: '#654321',
		trimColorMode: 'automatic',
		trimAutoMode: 'matchRoof',
		sidingTexture: 'T1-11',
		roofMaterial: 'metal',
		roofLowerPitch: GAMBREL_LOWER_PITCH,
		roofUpperPitch: GAMBREL_UPPER_PITCH,
		foundationHeight: 1.5,
		foundationColor: '#8B7355',
		porch: { enabled: false, wall: 'front', depth: 6 },
		options: {
			garageDoor:     { enabled: false, size: '8x7', style: 'sectional' },
			additionalDoor: { enabled: false, size: '6x7' },
			entryDoor:      { enabled: false, type: 'steel' },
			vinylWindows:   { enabled: false, count: 1, windowSize: '2x2' },
			octagonWindow:  { enabled: false, ends: 'front' }, // 'front' | 'back' | 'both'
			skylight:       { enabled: false, runningFt: 8 },
			shutters:       { enabled: false, pairs: 1 },
			ramp:           { enabled: false, size: 'small' },
			octagonVent:    { enabled: false, ends: 'front' },
		},
		price: 0,
		placements: [],
	}),
	// Get calculated price (derived state)
	getPrice: () => {
		const state = useShedStore.getState();
		return calculateTotalPrice(state.width, state.length, state.tier, state.options);
	},
	// Get full configuration
	getConfig: () => {
		const state = useShedStore.getState();
		return {
			width: state.width,
			length: state.length,
			tier: state.tier,
			model: state.model,
			color: state.color,
			roofColor: state.roofColor,
			trimColor: state.trimColor,
			trimColorMode: state.trimColorMode,
			trimAutoMode: state.trimAutoMode,
			sidingTexture: state.sidingTexture,
			roofMaterial: state.roofMaterial,
			roofLowerPitch: state.roofLowerPitch,
			roofUpperPitch: state.roofUpperPitch,
			foundationHeight: state.foundationHeight,
			foundationColor: state.foundationColor,
			placements: state.placements,
			porch: state.porch,
			options: state.options,
			price: calculateTotalPrice(state.width, state.length, state.tier, state.options),
		};
	},
}));
