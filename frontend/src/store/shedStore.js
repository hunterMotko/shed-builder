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
	// Options that have no position on the shed.
	//
	// **Doors, windows, shutters and ramps are not here.** Anything that sits
	// somewhere is a Placement, and the Quote counts Placements: a flag beside
	// them would be a second copy of the same fact, and two copies drift. That
	// is what let a garage door add $500 and no geometry (issue #10).
	options: {
		octagonWindow:  { enabled: false, ends: 'front' }, // 'front' | 'back' | 'both'
		skylight:       { enabled: false, runningFt: 8 },
		octagonVent:    { enabled: false, ends: 'front' },
		// Interior Options. Quantities, not positions: none of them takes a
		// Placement, and `loft.sqft` is footage *added* — a Barn is already
		// built with a half loft, and this buys more on top of it.
		workbench:      { enabled: false, runningFt: 8 },
		pegboard:       { enabled: false, sheets: 2 },
		loft:           { enabled: false, sqft: 96 },
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
	// Resizing does not touch the Placements, and does not have to: whether an
	// Opening still fits is a *question about* the Design rather than a fact
	// stored beside it, so `placementIssues` asks the kernel on demand. A
	// stored answer would be one more copy to go stale — the same trap the
	// Option flags were.
	//
	// Changing the Model can change the grade, because a Gable is sold as a
	// Deluxe only: switching a Standard Barn to a Gable has to move it up a
	// grade rather than leave it on a combination the catalog does not sell.
	// Every Standard size is also sold as a Deluxe, so it keeps its size.
	setModel: (model) => set((s) => ({
		model,
		...snapToValidCombo(s.width, s.length, s.tier, model),
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
		options: {
			octagonWindow:  { enabled: false, ends: 'front' }, // 'front' | 'back' | 'both'
			skylight:       { enabled: false, runningFt: 8 },
			octagonVent:    { enabled: false, ends: 'front' },
			workbench:      { enabled: false, runningFt: 8 },
			pegboard:       { enabled: false, sheets: 2 },
			loft:           { enabled: false, sqft: 96 },
		},
		price: 0,
		placements: [],
	}),
	// Get calculated price (derived state)
	getPrice: () => {
		const state = useShedStore.getState();
		return calculateTotalPrice(state.width, state.length, state.tier, state.options, state.placements);
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
			options: state.options,
			price: calculateTotalPrice(state.width, state.length, state.tier, state.options, state.placements),
		};
	},
}));
