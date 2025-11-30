export const DimensionsSection = ({ width, length, onWidthChange, onLengthChange }) => {
  return (
    <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
      <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
        Dimensions
      </h2>

      <div className="space-y-5">
        {/* Width Control */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-gray-700">Width</label>
            <span className="text-lg font-semibold text-blue-600">{width} ft</span>
          </div>
          <input
            type="range"
            min="8"
            max="20"
            value={width}
            onChange={(e) => onWidthChange(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>8 ft</span>
            <span>20 ft</span>
          </div>
        </div>

        {/* Length Control */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-gray-700">Length</label>
            <span className="text-lg font-semibold text-blue-600">{length} ft</span>
          </div>
          <input
            type="range"
            min="8"
            max="24"
            value={length}
            onChange={(e) => onLengthChange(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>8 ft</span>
            <span>24 ft</span>
          </div>
        </div>

        {/* Size Info */}
        <div className="text-xs text-gray-700 bg-blue-50 p-3 rounded-md border border-blue-100">
          <span className="font-semibold">Size:</span> {width} × {length} ft = <span className="font-bold text-blue-600">{width * length} sq ft</span>
        </div>
      </div>
    </div>
  );
};
