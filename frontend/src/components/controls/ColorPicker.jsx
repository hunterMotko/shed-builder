/**
 * ColorPicker Component
 *
 * Simple custom color picker for users who want to pick any color
 * Features:
 * - HTML5 color input for native color picker
 * - HEX input field for manual entry
 * - Live preview of selected color
 * - Accessibility attributes
 */

export const ColorPicker = ({ currentColor, onColorChange }) => {
  const handleInputChange = (e) => {
    const value = e.target.value;
    // Ensure it's a valid hex color
    if (value.match(/^#[0-9A-F]{6}$/i)) {
      onColorChange(value);
    }
  };

  return (
    <div className="space-y-3">
      {/* Native Color Picker */}
      <div>
        <label
          htmlFor="custom-color-picker"
          className="text-xs font-medium text-gray-600 mb-2 block"
        >
          Select Color
        </label>
        <input
          id="custom-color-picker"
          type="color"
          value={currentColor}
          onChange={(e) => onColorChange(e.target.value)}
          className="
            w-full h-12 rounded-lg cursor-pointer
            border-2 border-gray-300
            hover:border-gray-400
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          "
          aria-label="Color picker"
        />
      </div>

      {/* Manual HEX Input */}
      <div>
        <label
          htmlFor="custom-hex-input"
          className="text-xs font-medium text-gray-600 mb-2 block"
        >
          Or enter HEX code
        </label>
        <input
          id="custom-hex-input"
          type="text"
          value={currentColor.toUpperCase()}
          onChange={handleInputChange}
          placeholder="#000000"
          className="
            w-full px-3 py-2 rounded-lg border-2 border-gray-300
            font-mono text-sm
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            focus:border-blue-600
          "
          maxLength={7}
          aria-label="Hex color code input"
          title="Enter a valid HEX color code (e.g., #FF0000)"
        />
      </div>
    </div>
  );
};
