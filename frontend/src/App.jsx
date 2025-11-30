import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { Suspense, useState } from 'react';
import { BarnShed } from './components/BarnShed/BarnShed';
import { GableShed } from './components/GableShed/GableShed';
import { useShedStore } from './store/shedStore';
import './App.css';

function App() {
  const {
    width,
    length,
    style,
    color,
    roofColor,
    trimColor,
    placements,
    setWidth,
    setLength,
    setStyle,
    setColor,
    setRoofColor,
    setTrimColor,
  } = useShedStore();

  const [price, setPrice] = useState(0);

  // Calculate price: $10 per sq ft + $500 for Barn style
  const calculatePrice = (w, l, s) => {
    const baseArea = w * l;
    const basePrice = baseArea * 10;
    const styleAddon = s === 'Barn' ? 500 : 0;
    return basePrice + styleAddon;
  };

  const handleDimensionChange = (newWidth, newLength, newStyle) => {
    setPrice(calculatePrice(newWidth, newLength, newStyle));
  };

  const handleWidthChange = (e) => {
    const newWidth = parseInt(e.target.value);
    setWidth(newWidth);
    handleDimensionChange(newWidth, length, style);
  };

  const handleLengthChange = (e) => {
    const newLength = parseInt(e.target.value);
    setLength(newLength);
    handleDimensionChange(width, newLength, style);
  };

  const handleStyleChange = (e) => {
    const newStyle = e.target.value;
    setStyle(newStyle);
    handleDimensionChange(width, length, newStyle);
  };

  const handleSaveDesign = async () => {
    const config = {
      width,
      length,
      style,
      color,
      roofColor,
      trimColor,
      placements,
      price,
    };

    try {
      const response = await fetch('http://localhost:8080/api/save-design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Design saved! ID: ${data.id}`);
      } else {
        alert('Failed to save design');
      }
    } catch (error) {
      console.error('Error saving design:', error);
      alert('Error saving design: ' + error.message);
    }
  };

  return (
    <div className="w-full h-screen flex gap-4 bg-gray-900 p-4">
      {/* Controls Panel */}
      <div className="w-96 bg-gray-800 rounded-lg p-6 overflow-y-auto shadow-lg">
        <h1 className="text-3xl font-bold text-white mb-8">Shed Configurator</h1>

        {/* Dimensions Section */}
        <div className="mb-8 pb-6 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-gray-200 mb-4">Dimensions</h2>

          {/* Width Control */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Width: {width} ft
            </label>
            <input
              type="range"
              min="8"
              max="20"
              value={width}
              onChange={handleWidthChange}
              className="w-full"
            />
          </div>

          {/* Length Control */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Length: {length} ft
            </label>
            <input
              type="range"
              min="8"
              max="24"
              value={length}
              onChange={handleLengthChange}
              className="w-full"
            />
          </div>
        </div>

        {/* Style & Colors Section */}
        <div className="mb-8 pb-6 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-gray-200 mb-4">Style & Colors</h2>

          {/* Style Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Roof Style
            </label>
            <select
              value={style}
              onChange={handleStyleChange}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600"
            >
              <option value="Gable">Gable</option>
              <option value="Barn">Barn (Gambrel)</option>
            </select>
          </div>

          {/* Siding Color */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Siding Color
            </label>
            <div className="flex gap-3 items-center">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-12 h-10 rounded cursor-pointer"
              />
              <span className="text-xs text-gray-400">{color}</span>
            </div>
          </div>

          {/* Roof Color */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Roof Color
            </label>
            <div className="flex gap-3 items-center">
              <input
                type="color"
                value={roofColor}
                onChange={(e) => setRoofColor(e.target.value)}
                className="w-12 h-10 rounded cursor-pointer"
              />
              <span className="text-xs text-gray-400">{roofColor}</span>
            </div>
          </div>

          {/* Trim Color */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Trim Color
            </label>
            <div className="flex gap-3 items-center">
              <input
                type="color"
                value={trimColor}
                onChange={(e) => setTrimColor(e.target.value)}
                className="w-12 h-10 rounded cursor-pointer"
              />
              <span className="text-xs text-gray-400">{trimColor}</span>
            </div>
          </div>
        </div>

        {/* Price & Summary Section */}
        <div className="mb-8 pb-6 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-gray-200 mb-4">Summary</h2>
          <div className="space-y-3 text-sm text-gray-300">
            <p>
              <span className="text-gray-400">Style:</span>
              <span className="float-right font-medium">{style}</span>
            </p>
            <p>
              <span className="text-gray-400">Dimensions:</span>
              <span className="float-right font-medium">
                {width}ft W × {length}ft L
              </span>
            </p>
            <p>
              <span className="text-gray-400">Area:</span>
              <span className="float-right font-medium">{width * length} sq ft</span>
            </p>
            <p>
              <span className="text-gray-400">Doors/Windows:</span>
              <span className="float-right font-medium">{placements.length}</span>
            </p>
            <div className="pt-3 border-t border-gray-700">
              <p>
                <span className="text-white font-semibold">Estimated Price:</span>
                <span className="float-right font-bold text-green-400 text-lg">
                  ${price.toLocaleString()}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleSaveDesign}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition"
          >
            Save Design
          </button>
          <button
            onClick={() => useShedStore.getState().reset()}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded transition"
          >
            Reset
          </button>
        </div>
      </div>

      {/* 3D Canvas */}
      <div className="flex-1 bg-gray-950 rounded-lg overflow-hidden shadow-lg">
        <Canvas camera={{ position: [25, 20, 25], fov: 50 }}>
          <ambientLight intensity={0.6} />
          <pointLight position={[15, 20, 10]} intensity={1} />
          <pointLight position={[-15, 20, -10]} intensity={0.5} />

          <Suspense fallback={null}>
            {style === 'Barn' ? (
              <BarnShed width={width} length={length} color={color} roofColor={roofColor} />
            ) : (
              <GableShed width={width} length={length} color={color} roofColor={roofColor} />
            )}
          </Suspense>

          <Grid infiniteGrid />
          <OrbitControls />
        </Canvas>
      </div>
    </div>
  );
}

export default App;
