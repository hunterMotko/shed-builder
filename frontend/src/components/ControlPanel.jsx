import axios from 'axios';
import { useShedStore } from '../store/shedStore';
import { DimensionsSection } from './controls/DimensionsSection';
import { StyleSection } from './controls/StyleSection';
import { ColorSection } from './controls/ColorSection';
import { TrimAndDetailsSection } from './controls/TrimAndDetailsSection';
import { PriceDisplay } from './controls/PriceDisplay';
import { ActionButtons } from './controls/ActionButtons';
import { PlacementList } from './PlacementList';

const API_BASE_URL = 'http://localhost:8080/api';

export const ControlPanel = () => {
  const {
    width,
    length,
    style,
    color,
    roofColor,
    price,
    setWidth,
    setLength,
    setStyle,
    setColor,
    setRoofColor,
    setPrice,
    getConfig,
    reset,
  } = useShedStore();

  const calculatePrice = (w, l, s) => {
    const basePrice = w * l * 10; // $10 per sq ft
    const total = s === 'Barn' ? basePrice + 500 : basePrice;
    return total.toFixed(2);
  };

  const handleDimensionChange = (newWidth, newLength, newStyle) => {
    const newPrice = calculatePrice(newWidth, newLength, newStyle);
    setPrice(parseFloat(newPrice));
  };

  const handleWidthChange = (newWidth) => {
    setWidth(newWidth);
    handleDimensionChange(newWidth, length, style);
  };

  const handleLengthChange = (newLength) => {
    setLength(newLength);
    handleDimensionChange(width, newLength, style);
  };

  const handleStyleChange = (newStyle) => {
    setStyle(newStyle);
    handleDimensionChange(width, length, newStyle);
  };

  const handleColorChange = (newColor) => {
    setColor(newColor);
  };

  const handleRoofColorChange = (newRoofColor) => {
    setRoofColor(newRoofColor);
  };

  const handleSaveDesign = async () => {
    try {
      const config = getConfig();
      const response = await axios.post(`${API_BASE_URL}/save-design`, config);
      alert(`Design saved! ID: ${response.data.id}\nPrice: $${response.data.price.toFixed(2)}`);
    } catch (error) {
      console.error('Error saving design:', error);
      alert('Failed to save design');
    }
  };

  const handleLoadDesign = async () => {
    const id = prompt('Enter design ID to load:');
    if (!id) return;

    try {
      const response = await axios.get(`${API_BASE_URL}/design/${id}`);
      const design = response.data;
      setWidth(design.width);
      setLength(design.length);
      setStyle(design.style);
      setColor(design.color);
      setRoofColor(design.roofColor);
      setPrice(design.price);
      alert('Design loaded successfully!');
    } catch (error) {
      console.error('Error loading design:', error);
      alert('Failed to load design');
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-gray-50 to-gray-100 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-5 shadow-sm z-10">
        <h1 className="text-2xl font-bold text-gray-900">Shed Configurator</h1>
        <p className="text-sm text-gray-500 mt-1">Customize your shed design in real time</p>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 py-6 space-y-6">
        {/* Dimensions Section */}
        <DimensionsSection
          width={width}
          length={length}
          onWidthChange={handleWidthChange}
          onLengthChange={handleLengthChange}
        />

        {/* Style Section */}
        <StyleSection
          style={style}
          onStyleChange={handleStyleChange}
        />

        {/* Colors Section */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
            Colors
          </h2>

          {/* Siding Color */}
          <ColorSection
            label="Siding Color"
            currentColor={color}
            onColorChange={handleColorChange}
            colorType="siding"
          />

          {/* Roof Color */}
          <ColorSection
            label="Roof Color"
            currentColor={roofColor}
            onColorChange={handleRoofColorChange}
            colorType="roof"
          />
        </div>

        {/* Trim & Details Section */}
        <TrimAndDetailsSection />

        {/* Doors & Windows Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
            Doors & Windows
          </h2>
          <PlacementList />
        </div>

        {/* Price Display */}
        <PriceDisplay price={price} style={style} width={width} length={length} />
      </div>

      {/* Footer - Actions */}
      <div className="border-t border-gray-200 bg-white px-6 py-4 sticky bottom-0">
        <ActionButtons
          onSave={handleSaveDesign}
          onLoad={handleLoadDesign}
          onReset={reset}
        />
      </div>
    </div>
  );
};
