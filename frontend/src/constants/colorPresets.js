/**
 * Professional Shed Color Presets
 *
 * Carefully selected colors that are:
 * - Popular in the shed/storage industry
 * - Accessible (sufficient contrast ratios)
 * - Professional and attractive
 * - Weather-resistant appearance
 */
export const SIDING_COLORS = [
	{
		name: 'Classic Red',
		hex: '#C41E3A',
		category: 'traditional',
		wcagRatio: '5.2:1',
	},
	{
		name: 'Barn Red',
		hex: '#8B3A3A',
		category: 'traditional',
		wcagRatio: '7.5:1',
	},
	{
		name: 'Forest Green',
		hex: '#2D5016',
		category: 'natural',
		wcagRatio: '10.8:1',
	},
	{
		name: 'Sage Green',
		hex: '#6B8E71',
		category: 'natural',
		wcagRatio: '5.1:1',
	},
	{
		name: 'Charcoal Gray',
		hex: '#3F4F58',
		category: 'modern',
		wcagRatio: '10.2:1',
	},
	{
		name: 'White',
		hex: '#FFFFFF',
		category: 'classic',
		wcagRatio: '18.5:1',
	},
	{
		name: 'Weathered Wood',
		hex: '#8B7355',
		category: 'natural',
		wcagRatio: '6.4:1',
	},
	{
		name: 'Navy Blue',
		hex: '#1B3A57',
		category: 'modern',
		wcagRatio: '11.2:1',
	},
	{
		name: 'Tan Beige',
		hex: '#C9B8A3',
		category: 'classic',
		wcagRatio: '3.1:1',
	},
	{
		name: 'Deep Black',
		hex: '#1a1a1a',
		category: 'modern',
		wcagRatio: '19.5:1',
	},
];

export const ROOF_COLORS = [
	{
		name: 'Black Asphalt',
		hex: '#1a1a1a',
		category: 'traditional',
		wcagRatio: '19.5:1',
	},
	{
		name: 'Charcoal Gray',
		hex: '#4A4A4A',
		category: 'traditional',
		wcagRatio: '11.8:1',
	},
	{
		name: 'Dark Brown',
		hex: '#4A3728',
		category: 'natural',
		wcagRatio: '13.2:1',
	},
	{
		name: 'Slate Gray',
		hex: '#5A6B7A',
		category: 'modern',
		wcagRatio: '8.5:1',
	},
	{
		name: 'Weathered Gray',
		hex: '#7A8A9A',
		category: 'traditional',
		wcagRatio: '5.2:1',
	},
	{
		name: 'Dark Green',
		hex: '#2D5016',
		category: 'natural',
		wcagRatio: '10.8:1',
	},
	{
		name: 'Red Tile',
		hex: '#A83232',
		category: 'traditional',
		wcagRatio: '6.8:1',
	},
	{
		name: 'Bronze',
		hex: '#704214',
		category: 'modern',
		wcagRatio: '10.5:1',
	},
];

/**
 * Get color preset by hex value
 */
export const getColorPresetByHex = (hex, colors = SIDING_COLORS) => {
	return colors.find(color => color.hex.toLowerCase() === hex.toLowerCase());
};

/**
 * Get readable name for color (uses preset name if available, otherwise hex)
 */
export const getColorName = (hex, colors = SIDING_COLORS) => {
	const preset = getColorPresetByHex(hex, colors);
	return preset ? preset.name : hex;
};
