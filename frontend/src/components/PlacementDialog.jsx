import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useShedStore } from '../store/shedStore';
import { PRESETS_BY_TYPE } from '../utils/placementPresets';
import { validatePlacement, checkPlacementConflicts } from '../utils/placementValidator';

const PLACEMENT_TYPES = [
  { value: 'door',            label: 'Entry Door' },
  { value: 'window',          label: 'Window' },
  { value: 'garage_door',     label: 'Garage Door' },
  { value: 'swing_barn_door', label: 'Swing Barn Door' },
];

/**
 * Dialog for placing doors and windows on shed walls.
 * Opens when user clicks on a wall in the 3D view.
 */
export const PlacementDialog = ({
	isOpen = false,
	wall = null,
	normalizedX = 0.5,
	normalizedY = 0.5,
	onClose = null,
}) => {
	const { addPlacement, width: shedWidth, length: shedLength, wallHeight, placements } = useShedStore();
	const [placementType, setPlacementType] = useState('door');
	const [width, setWidth] = useState(3);
	const [height, setHeight] = useState(6.8);
	const [usePreset, setUsePreset] = useState(true);
	const [selectedPreset, setSelectedPreset] = useState(0);
	const [validationErrors, setValidationErrors] = useState([]);
	const [validationWarnings, setValidationWarnings] = useState([]);

	// Update values when preset changes
	useEffect(() => {
		const presets = PRESETS_BY_TYPE[placementType];
		if (usePreset && presets && selectedPreset < presets.length) {
			const preset = presets[selectedPreset];
			setWidth(preset.width);
			setHeight(preset.height);
		}
	}, [selectedPreset, placementType, usePreset]);

	// Reset preset selection when type changes
	useEffect(() => {
		setSelectedPreset(0);
	}, [placementType]);

	// Validate placement when values change
	useEffect(() => {
		if (!wall || shedWidth === undefined) return;
		const testPlacement = {
			id: 'temp',
			type: placementType,
			wall,
			normalizedX,
			normalizedY,
			width,
			height,
			rotationZ: 0,
		};
		const validation = validatePlacement(testPlacement, {
			width: shedWidth,
			length: shedLength,
			wallHeight,
		});
		setValidationErrors(validation.errors);
		setValidationWarnings(validation.warnings);
	}, [placementType, wall, normalizedX, normalizedY, width, height, shedWidth, shedLength, wallHeight]);

	const handlePresetChange = (e) => {
		const index = Number(e.target.value);
		setSelectedPreset(index);
		const preset = PRESETS_BY_TYPE[placementType]?.[index];
		if (preset) {
			setWidth(preset.width);
			setHeight(preset.height);
		}
	};

	const handleAddPlacement = () => {
		if (validationErrors.length > 0) {
			alert('Cannot add placement:\n' + validationErrors.join('\n'));
			return;
		}

		const newPlacement = {
			id: uuidv4(),
			type: placementType,
			wall,
			normalizedX,
			normalizedY,
			width,
			height,
			rotationZ: 0,
		};

		const conflicts = checkPlacementConflicts(newPlacement, placements, {
			width: shedWidth,
			length: shedLength,
			wallHeight,
		});

		if (conflicts.overlaps) {
			const proceed = confirm(
				`This placement may overlap with ${conflicts.conflicts.length} existing item(s). Continue anyway?`
			);
			if (!proceed) return;
		}

		addPlacement(newPlacement);
		if (onClose) onClose();
	};

	if (!isOpen || !wall) return null;

	const presets = PRESETS_BY_TYPE[placementType] ?? [];
	const wallName = wall.charAt(0).toUpperCase() + wall.slice(1);
	const typeLabel = PLACEMENT_TYPES.find((t) => t.value === placementType)?.label ?? placementType;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div className="bg-white rounded-lg shadow-lg p-6 w-96">
				{/* Header */}
				<div className="mb-6">
					<h2 className="text-2xl font-bold text-gray-800">Add Opening</h2>
					<p className="text-gray-600 text-sm mt-1">Placing on {wallName} wall</p>
					<p className="text-gray-500 text-xs mt-1">
						Position: {(normalizedX * 100).toFixed(0)}% × {(normalizedY * 100).toFixed(0)}%
					</p>
				</div>

				{/* Type Selection */}
				<div className="mb-6">
					<label className="block text-sm font-semibold text-gray-700 mb-3">Type</label>
					<div className="grid grid-cols-2 gap-2">
						{PLACEMENT_TYPES.map((t) => (
							<label key={t.value} className="flex items-center gap-2 cursor-pointer p-2 border rounded-lg hover:bg-gray-50">
								<input
									type="radio"
									name="type"
									value={t.value}
									checked={placementType === t.value}
									onChange={(e) => setPlacementType(e.target.value)}
									className="w-4 h-4"
								/>
								<span className="text-sm text-gray-700">{t.label}</span>
							</label>
						))}
					</div>
				</div>

				{/* Preset Selection */}
				<div className="mb-6">
					<label className="block text-sm font-semibold text-gray-700 mb-3">Size Preset</label>
					<select
						value={selectedPreset}
						onChange={handlePresetChange}
						className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
					>
						{presets.map((preset, idx) => (
							<option key={idx} value={idx}>
								{preset.name}
							</option>
						))}
					</select>
				</div>

				{/* Custom Size Input */}
				<div className="mb-6 pb-6 border-b border-gray-200">
					<label className="flex items-center gap-2 mb-4 cursor-pointer">
						<input
							type="checkbox"
							checked={!usePreset}
							onChange={(e) => setUsePreset(!e.target.checked)}
							className="w-4 h-4"
						/>
						<span className="text-sm text-gray-700">Custom Size</span>
					</label>

					{!usePreset && (
						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="block text-xs font-semibold text-gray-700 mb-2">Width (ft)</label>
								<input
									type="number"
									min="0.5"
									max="14"
									step="0.5"
									value={width}
									onChange={(e) => setWidth(Number(e.target.value))}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							</div>
							<div>
								<label className="block text-xs font-semibold text-gray-700 mb-2">Height (ft)</label>
								<input
									type="number"
									min="0.5"
									max="12"
									step="0.5"
									value={height}
									onChange={(e) => setHeight(Number(e.target.value))}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							</div>
						</div>
					)}
				</div>

				{/* Size Preview */}
				<div className="mb-6 p-4 bg-gray-100 rounded-lg">
					<p className="text-xs text-gray-600 mb-2">Preview Size:</p>
					<p className="text-lg font-bold text-gray-800">
						{width.toFixed(1)}ft × {height.toFixed(1)}ft
					</p>
				</div>

				{/* Validation Errors */}
				{validationErrors.length > 0 && (
					<div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
						<p className="text-sm font-semibold text-red-700 mb-2">Issues:</p>
						<ul className="text-xs text-red-600 space-y-1">
							{validationErrors.map((error, idx) => (
								<li key={idx}>• {error}</li>
							))}
						</ul>
					</div>
				)}

				{/* Validation Warnings */}
				{validationWarnings.length > 0 && (
					<div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
						<p className="text-sm font-semibold text-yellow-700 mb-2">Warnings:</p>
						<ul className="text-xs text-yellow-600 space-y-1">
							{validationWarnings.map((warning, idx) => (
								<li key={idx}>⚠ {warning}</li>
							))}
						</ul>
					</div>
				)}

				{/* Action Buttons */}
				<div className="flex gap-3">
					<button
						onClick={onClose}
						className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition"
					>
						Cancel
					</button>
					<button
						onClick={handleAddPlacement}
						disabled={validationErrors.length > 0}
						className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
							validationErrors.length > 0
								? 'bg-gray-300 text-gray-500 cursor-not-allowed'
								: 'bg-blue-600 text-white hover:bg-blue-700'
						}`}
					>
						Add {typeLabel}
					</button>
				</div>
			</div>
		</div>
	);
};
