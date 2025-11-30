export const StyleSection = ({ style, onStyleChange }) => {
  return (
    <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
      <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
        Roof Style
      </h2>

      <div className="grid grid-cols-2 gap-3">
        <label 
          className="flex items-center p-3 border-2 rounded-lg cursor-pointer transition duration-200"
          style={{ 
            borderColor: style === 'Gable' ? '#2563eb' : '#e5e7eb', 
            backgroundColor: style === 'Gable' ? '#eff6ff' : '#f9fafb' 
          }}
        >
          <input
            type="radio"
            name="style"
            value="Gable"
            checked={style === 'Gable'}
            onChange={(e) => onStyleChange(e.target.value)}
            className="mr-2 w-4 h-4"
          />
          <span className="text-sm font-medium text-gray-700">Gable</span>
        </label>

        <label
          className="flex items-center p-3 border-2 rounded-lg cursor-pointer transition duration-200"
          style={{
            borderColor: style === 'Gambrel' ? '#2563eb' : '#e5e7eb',
            backgroundColor: style === 'Gambrel' ? '#eff6ff' : '#f9fafb'
          }}
        >
          <input
            type="radio"
            name="style"
            value="Gambrel"
            checked={style === 'Gambrel'}
            onChange={(e) => onStyleChange(e.target.value)}
            className="mr-2 w-4 h-4"
          />
          <span className="text-sm font-medium text-gray-700">Gambrel (Barn)</span>
        </label>
      </div>
    </div>
  );
};
