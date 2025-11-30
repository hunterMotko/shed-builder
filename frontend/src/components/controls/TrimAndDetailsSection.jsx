import { useShedStore } from '../../store/shedStore';
import { getEffectiveTrimColor } from '../../utils/advancedColorUtils';

export const TrimAndDetailsSection = () => {
  const {
    color: wallColor,
    roofColor,
    trimColor,
    trimColorMode,
    trimAutoMode,
    sidingTexture,
    roofMaterial,
    setTrimColor,
    setTrimColorMode,
    setTrimAutoMode,
    setSidingTexture,
    setRoofMaterial,
  } = useShedStore();

  const effectiveTrimColor = getEffectiveTrimColor(
    trimColor,
    trimColorMode,
    wallColor,
    roofColor,
    trimAutoMode
  );

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200 space-y-4">
      <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
        Trim & Details
      </h2>

      {/* Trim Color Mode Selection */}
      <div>
        <label className="text-xs font-semibold text-gray-700 mb-2 block">
          Trim Color Mode
        </label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="trimColorMode"
              value="automatic"
              checked={trimColorMode === 'automatic'}
              onChange={(e) => setTrimColorMode(e.target.value)}
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-700">Automatic</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="trimColorMode"
              value="manual"
              checked={trimColorMode === 'manual'}
              onChange={(e) => setTrimColorMode(e.target.value)}
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-700">Manual</span>
          </label>
        </div>
      </div>

      {/* Automatic Mode Options */}
      {trimColorMode === 'automatic' && (
        <div>
          <label className="text-xs font-semibold text-gray-700 mb-2 block">
            Automatic Mode
          </label>
          <select
            value={trimAutoMode}
            onChange={(e) => setTrimAutoMode(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="matchRoof">Match Roof Color</option>
            <option value="contrast">Maximum Contrast</option>
          </select>
          <p className="text-xs text-gray-500 mt-2">
            Current: <span className="font-semibold">{
              trimAutoMode === 'matchRoof' ? 'Matching roof' : 'Professional contrast'
            }</span>
          </p>
        </div>
      )}

      {/* Manual Trim Color Picker */}
      {trimColorMode === 'manual' && (
        <div>
          <label className="text-xs font-semibold text-gray-700 mb-2 block">
            Trim Color
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={trimColor}
              onChange={(e) => setTrimColor(e.target.value)}
              className="w-12 h-10 rounded cursor-pointer border border-gray-300"
            />
            <div>
              <p className="text-sm text-gray-800">{trimColor}</p>
              <div
                className="w-24 h-6 rounded border border-gray-400 mt-1"
                style={{ backgroundColor: trimColor }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Current Effective Trim Color Display */}
      {trimColorMode === 'automatic' && (
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs font-semibold text-gray-700 mb-2">
            Current Trim Color
          </p>
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-8 rounded border border-gray-400"
              style={{ backgroundColor: effectiveTrimColor }}
            />
            <span className="text-sm text-gray-800">{effectiveTrimColor}</span>
          </div>
        </div>
      )}

      {/* Siding Texture Selection */}
      <div>
        <label className="text-xs font-semibold text-gray-700 mb-2 block">
          Siding Texture
        </label>
        <select
          value={sidingTexture}
          onChange={(e) => setSidingTexture(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="T1-11">T1-11 Plywood (Ribbed)</option>
          <option value="smooth">Smooth Board</option>
        </select>
        <p className="text-xs text-gray-500 mt-2">
          Selected: <span className="font-semibold">{
            sidingTexture === 'T1-11' ? 'T1-11 (Vertical Ribbed)' : 'Smooth Board'
          }</span>
        </p>
      </div>

      {/* Roof Material Selection */}
      <div>
        <label className="text-xs font-semibold text-gray-700 mb-2 block">
          Roof Material
        </label>
        <select
          value={roofMaterial}
          onChange={(e) => setRoofMaterial(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="metal">Metal (Corrugated)</option>
          <option value="shingle">Asphalt Shingle</option>
        </select>
        <p className="text-xs text-gray-500 mt-2">
          Selected: <span className="font-semibold">{
            roofMaterial === 'metal' ? 'Metal Corrugated' : 'Asphalt Shingle'
          }</span>
        </p>
      </div>
    </div>
  );
};
