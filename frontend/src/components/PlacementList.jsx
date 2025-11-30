import { useShedStore } from '../store/shedStore';

/**
 * Displays list of all door and window placements
 * Allows removing individual placements
 */
export const PlacementList = () => {
  const placements = useShedStore((state) => state.placements);
  const removePlacement = useShedStore((state) => state.removePlacement);
  const clearPlacements = useShedStore((state) => state.clearPlacements);

  if (placements.length === 0) {
    return (
      <div className="text-center text-gray-500 text-sm py-4">
        No doors or windows placed yet. Click on a wall to add one.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-800">
          Placements ({placements.length})
        </h3>
        {placements.length > 0 && (
          <button
            onClick={clearPlacements}
            className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {placements.map((placement, idx) => (
          <div
            key={placement.id}
            className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200 hover:bg-gray-100 transition"
          >
            <div className="flex-1">
              <div className="font-medium text-gray-800">
                {idx + 1}. {placement.type === 'door' ? '🚪' : '🪟'}{' '}
                {placement.type.charAt(0).toUpperCase() + placement.type.slice(1)}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                <div>{placement.wall.charAt(0).toUpperCase() + placement.wall.slice(1)} wall</div>
                <div>
                  {placement.width.toFixed(1)}ft × {placement.height.toFixed(1)}ft
                </div>
                <div>
                  Pos: {(placement.normalizedX * 100).toFixed(0)}% ×{' '}
                  {(placement.normalizedY * 100).toFixed(0)}%
                </div>
              </div>
            </div>
            <button
              onClick={() => removePlacement(placement.id)}
              className="ml-4 px-3 py-1 bg-red-100 text-red-600 rounded text-sm hover:bg-red-200 transition"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
