import { useState, useRef, useEffect } from 'react';

// Common shed colors
const SIDING_COLORS = [
	{ name: 'Saddle Brown', hex: '#8B4513' },
	{ name: 'Barn Red', hex: '#D2691E' },
	{ name: 'Forest Green', hex: '#228B22' },
	{ name: 'Dark Gray', hex: '#505050' },
	{ name: 'Light Gray', hex: '#A9A9A9' },
	{ name: 'White', hex: '#FFFFFF' },
	{ name: 'Black', hex: '#000000' },
	{ name: 'Tan', hex: '#D2B48C' },
	{ name: 'Deep Red', hex: '#8B0000' },
	{ name: 'Navy Blue', hex: '#000080' },
];

const ROOF_COLORS = [
	{ name: 'Dark Gray', hex: '#2F4F4F' },
	{ name: 'Black', hex: '#1C1C1C' },
	{ name: 'Charcoal', hex: '#36454F' },
	{ name: 'Slate Gray', hex: '#708090' },
	{ name: 'Rustic Red', hex: '#8B3A3A' },
	{ name: 'Dark Brown', hex: '#654321' },
	{ name: 'Forest Green', hex: '#1F4F1F' },
	{ name: 'Weathered Gray', hex: '#808080' },
	{ name: 'Deep Bronze', hex: '#6F5D3F' },
	{ name: 'Dark Burgundy', hex: '#722F37' },
];

export const ColorSection = ({ label, currentColor, onColorChange, colorType }) => {
	const colors = colorType === 'siding' ? SIDING_COLORS : ROOF_COLORS;
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef(null);

	// Get the name of the currently selected color
	const selectedColorName = colors.find((c) => c.hex === currentColor)?.name || 'Choose a color';

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
				setIsOpen(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	const handleColorSelect = (hex) => {
		onColorChange(hex);
		setIsOpen(false);
	};

	return (
		<div className="bg-white rounded-lg p-4 border border-gray-200">
			<h3 className="text-sm font-semibold text-gray-900 mb-3">{label}</h3>

			{/* Custom Color Dropdown */}
			<div className="relative" ref={dropdownRef}>
				<button
					onClick={() => setIsOpen(!isOpen)}
					className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white flex items-center justify-between hover:bg-gray-50 transition"
				>
					<div className="flex items-center gap-2">
						<div
							className="w-6 h-6 rounded border border-gray-400"
							style={{ backgroundColor: currentColor }}
						/>
						<span className="text-gray-700">{selectedColorName}</span>
					</div>
					<span className={`text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
						▼
					</span>
				</button>

				{/* Dropdown Menu with Color Swatches */}
				{isOpen && (
					<div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-10 p-4">
						<div className="grid grid-cols-5 gap-2">
							{colors.map((c) => (
								<button
									key={c.hex}
									onClick={() => handleColorSelect(c.hex)}
									className="w-full aspect-square rounded-lg border-2 transition-all hover:scale-110 hover:shadow-lg"
									style={{
										backgroundColor: c.hex,
										borderColor: currentColor === c.hex ? '#2563eb' : '#d1d5db',
										borderWidth: currentColor === c.hex ? '3px' : '2px',
									}}
									title={c.name}
								/>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
};
