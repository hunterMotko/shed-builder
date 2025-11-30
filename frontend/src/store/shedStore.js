import { create } from 'zustand';

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
  // Configuration state
  width: 12,
  length: 16,
  style: 'Gable',
  color: '#D2691E',
  roofColor: '#8B4513',

  // Trim and Detail Configuration
  trimColor: '#654321',
  trimColorMode: 'automatic', // 'automatic' or 'manual'
  trimAutoMode: 'matchRoof', // 'matchRoof' or 'contrast'

  // Material and Texture Configuration
  sidingTexture: 'T1-11', // 'T1-11', 'smooth'
  roofMaterial: 'metal', // 'metal', 'shingle'

  // Gambrel Roof Configuration (when style === 'Gambrel')
  roofLowerPitch: 5, // 5:12 pitch (steeper lower slope)
  roofUpperPitch: 10, // 10:12 pitch (gentler upper slope)

  // Foundation Configuration
  foundationHeight: 1.5, // feet
  foundationColor: '#8B7355', // brown/tan concrete/timber appearance

  // Calculated state
  price: 0,

  // Door & Window placement state
  placements: [],

  // Configuration Actions
  setWidth: (width) => set({ width }),
  setLength: (length) => set({ length }),
  setStyle: (style) => set({ style }),
  setColor: (color) => set({ color }),
  setRoofColor: (roofColor) => set({ roofColor }),
  setTrimColor: (trimColor) => set({ trimColor }),
  setTrimColorMode: (trimColorMode) => set({ trimColorMode }),
  setTrimAutoMode: (trimAutoMode) => set({ trimAutoMode }),
  setSidingTexture: (sidingTexture) => set({ sidingTexture }),
  setRoofMaterial: (roofMaterial) => set({ roofMaterial }),
  setPrice: (price) => set({ price }),
  setRoofLowerPitch: (roofLowerPitch) => set({ roofLowerPitch }),
  setRoofUpperPitch: (roofUpperPitch) => set({ roofUpperPitch }),
  setFoundationHeight: (foundationHeight) => set({ foundationHeight }),
  setFoundationColor: (foundationColor) => set({ foundationColor }),

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
    style: 'Gable',
    color: '#D2691E',
    roofColor: '#8B4513',
    trimColor: '#654321',
    trimColorMode: 'automatic',
    trimAutoMode: 'matchRoof',
    sidingTexture: 'T1-11',
    roofMaterial: 'metal',
    roofLowerPitch: 5,
    roofUpperPitch: 10,
    foundationHeight: 1.5,
    foundationColor: '#8B7355',
    price: 0,
    placements: [],
  }),

  // Get full configuration
  getConfig: () => {
    const state = useShedStore.getState();
    return {
      width: state.width,
      length: state.length,
      style: state.style,
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
    };
  },
}));
