import { create } from 'zustand';
import { calculateTotalPrice, snapToValidCombo } from '../utils/pricingUtils';

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
	// Configuration state — defaults to smallest standard barn (12×16×10)
	width: 12,
	length: 16,
	wallHeight: 10, // 10 = Standard, 11 = Deluxe, 12 = Special
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
	// The Barn's gambrel, to the build spec: the sides are a 12 pitch and the
	// top is a 4 pitch. The Knuckle is not stored — it follows from these two.
	roofLowerPitch: 12, // 12:12 (45°) — the steep side slope
	roofUpperPitch: 4,  // 4:12 (~18.4°) — the shallow slope at the ridge
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
		octagonWindow:  { enabled: false },
		skylight:       { enabled: false, runningFt: 8 },
		shutters:       { enabled: false, pairs: 1 },
		ramp:           { enabled: false, size: 'small' }, // 'small' | 'large'
		octagonVent:    { enabled: false },
	},
	// Calculated state
	price: 0,
	// Door & Window placement state
	// type: 'door' | 'window' | 'garage_door' | 'barn_door'
	placements: [],
	// Configuration Actions
	setWidth: (width) => set((s) => {
		const snapped = snapToValidCombo(width, s.length, s.wallHeight);
		return { width: snapped.width, length: snapped.length, wallHeight: snapped.wallHeight };
	}),
	setLength: (length) => set((s) => {
		const snapped = snapToValidCombo(s.width, length, s.wallHeight);
		return { width: snapped.width, length: snapped.length, wallHeight: snapped.wallHeight };
	}),
	setWallHeight: (wallHeight) => set((s) => {
		const snapped = snapToValidCombo(s.width, s.length, wallHeight);
		return { width: snapped.width, length: snapped.length, wallHeight: snapped.wallHeight };
	}),
	setModel: (model) => set((s) => ({
		model,
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
		wallHeight: 10,
		model: 'Gable',
		color: '#D2691E',
		roofColor: '#8B4513',
		trimColor: '#654321',
		trimColorMode: 'automatic',
		trimAutoMode: 'matchRoof',
		sidingTexture: 'T1-11',
		roofMaterial: 'metal',
		roofLowerPitch: 12,
		roofUpperPitch: 4,
		foundationHeight: 1.5,
		foundationColor: '#8B7355',
		porch: { enabled: false, wall: 'front', depth: 6 },
		options: {
			garageDoor:     { enabled: false, size: '8x7', style: 'sectional' },
			additionalDoor: { enabled: false, size: '6x7' },
			entryDoor:      { enabled: false, type: 'steel' },
			vinylWindows:   { enabled: false, count: 1, windowSize: '2x2' },
			octagonWindow:  { enabled: false },
			skylight:       { enabled: false, runningFt: 8 },
			shutters:       { enabled: false, pairs: 1 },
			ramp:           { enabled: false, size: 'small' },
			octagonVent:    { enabled: false },
		},
		price: 0,
		placements: [],
	}),
	// Get calculated price (derived state)
	getPrice: () => {
		const state = useShedStore.getState();
		return calculateTotalPrice(state.width, state.length, state.wallHeight, state.options);
	},
	// Get full configuration
	getConfig: () => {
		const state = useShedStore.getState();
		return {
			width: state.width,
			length: state.length,
			wallHeight: state.wallHeight,
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
			price: calculateTotalPrice(state.width, state.length, state.wallHeight, state.options),
		};
	},
}));
