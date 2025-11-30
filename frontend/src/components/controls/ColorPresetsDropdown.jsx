import { useState, useRef, useEffect } from 'react';
import { SIDING_COLORS, ROOF_COLORS, getColorPresetByHex } from '../../constants/colorPresets';
import { ChevronDownIcon } from '../icons/ChevronDownIcon';

/**
 * ColorPresetsDropdown Component
 *
 * Displays color presets in a dropdown with:
 * - Color swatches with names
 * - Organized by category
 * - Keyboard accessible
 * - WCAG accessibility info
 * - Current selection highlight
 */

export const ColorPresetsDropdown = ({
  currentColor,
  onColorChange,
  colorType = 'siding',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  const colors = colorType === 'roof' ? ROOF_COLORS : SIDING_COLORS;
  const currentPreset = getColorPresetByHex(currentColor, colors);
  const currentPresetName = currentPreset ? currentPreset.name : 'Custom Color';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        !buttonRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Group colors by category for organized display
  const colorsByCategory = colors.reduce((acc, color) => {
    if (!acc[color.category]) {
      acc[color.category] = [];
    }
    acc[color.category].push(color);
    return acc;
  }, {});

  const categoryOrder = ['traditional', 'natural', 'classic', 'modern'];
  const categoryLabels = {
    traditional: 'Traditional',
    natural: 'Natural',
    classic: 'Classic',
    modern: 'Modern',
  };

  const handleSelectColor = (hex) => {
    onColorChange(hex);
    setIsOpen(false);
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      buttonRef.current?.focus();
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full px-4 py-3 rounded-lg border-2 font-medium
          transition-all duration-200
          flex items-center justify-between
          ${
            isOpen
              ? 'border-blue-600 bg-blue-50 text-gray-900'
              : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
          }
        `}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Color presets, currently selected: ${currentPresetName}`}
      >
        <span className="text-sm flex items-center gap-2">
          <span
            className="w-4 h-4 rounded-full border border-gray-300"
            style={{ backgroundColor: currentColor }}
            aria-hidden="true"
          />
          {currentPresetName}
        </span>
        <ChevronDownIcon isOpen={isOpen} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg border border-gray-200 shadow-lg z-10 overflow-hidden"
          onKeyDown={handleKeyDown}
          role="listbox"
          aria-label="Color options"
        >
          {categoryOrder.map((category) => {
            const categoryColors = colorsByCategory[category];
            if (!categoryColors) return null;

            return (
              <div key={category}>
                {/* Category Header */}
                <div className="px-4 pt-3 pb-2 bg-gray-50 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    {categoryLabels[category]}
                  </p>
                </div>

                {/* Category Colors */}
                <div className="p-2">
                  {categoryColors.map((color) => (
                    <button
                      key={color.hex}
                      onClick={() => handleSelectColor(color.hex)}
                      className={`
                        w-full px-3 py-2 rounded-lg border-2 transition-all
                        flex items-center gap-3 text-left
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                        ${
                          currentColor.toLowerCase() === color.hex.toLowerCase()
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }
                      `}
                      role="option"
                      aria-selected={
                        currentColor.toLowerCase() === color.hex.toLowerCase()
                      }
                      aria-label={`${color.name}, ${color.hex}, WCAG contrast ${color.wcagRatio}`}
                    >
                      {/* Color Swatch */}
                      <div
                        className="w-6 h-6 rounded-md border border-gray-300 flex-shrink-0"
                        style={{ backgroundColor: color.hex }}
                        aria-hidden="true"
                      />

                      {/* Color Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {color.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {color.hex}
                          <span className="ml-2 text-gray-400">
                            WCAG {color.wcagRatio}
                          </span>
                        </p>
                      </div>

                      {/* Selected Indicator */}
                      {currentColor.toLowerCase() === color.hex.toLowerCase() && (
                        <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                          <svg
                            className="w-4 h-4 text-blue-600"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                            aria-hidden="true"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
