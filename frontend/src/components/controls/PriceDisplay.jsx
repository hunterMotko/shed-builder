export const PriceDisplay = ({ price, style }) => {
  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-5 border-2 border-green-200 shadow-sm">
      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
        Estimated Price
      </p>
      <p className="text-3xl font-bold text-green-600">${price.toFixed(2)}</p>
      <p className="text-xs text-gray-600 mt-3">
        {style === 'Barn' ? '💰 Includes $500 barn roof premium' : '✓ Standard pricing'}
      </p>
    </div>
  );
};