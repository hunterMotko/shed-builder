export const ActionButtons = ({ onSave, onLoad, onReset }) => {
  return (
    <div className="space-y-3">
      <button
        onClick={onSave}
        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 shadow-md hover:shadow-lg"
      >
        💾 Save Design
      </button>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onLoad}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
        >
          📂 Load Design
        </button>

        <button
          onClick={onReset}
          className="bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
        >
          🔄 Reset
        </button>
      </div>
    </div>
  );
};