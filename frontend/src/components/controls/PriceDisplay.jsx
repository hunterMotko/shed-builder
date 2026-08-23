import { useShedStore } from '../../store/shedStore';
import { lookupBasePrice, getShedTier, getAddOnLineItems } from '../../utils/pricingUtils';

export const PriceDisplay = () => {
  const width      = useShedStore((s) => s.width);
  const length     = useShedStore((s) => s.length);
  const wallHeight = useShedStore((s) => s.wallHeight);
  const addOns     = useShedStore((s) => s.addOns);

  const basePrice  = lookupBasePrice(width, length, wallHeight) ?? 0;
  const lineItems  = getAddOnLineItems(addOns);
  const total      = basePrice + lineItems.reduce((s, i) => s + i.amount, 0);
  const tier       = getShedTier(wallHeight);

  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-5 border-2 border-green-200 shadow-sm">
      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">
        Estimated Price
      </p>

      {/* Base price line */}
      <div className="flex justify-between items-center text-sm text-gray-700 mb-1">
        <span>Base ({width}×{length}×{wallHeight} {tier})</span>
        <span className="font-medium">${basePrice.toLocaleString()}</span>
      </div>

      {/* Add-on lines */}
      {lineItems.map((item, i) => (
        <div key={i} className="flex justify-between items-center text-sm text-gray-600 mb-1 pl-3">
          <span>+ {item.label}</span>
          <span>${item.amount.toLocaleString()}</span>
        </div>
      ))}

      {/* Divider + Total */}
      <div className="border-t border-green-300 mt-3 pt-3 flex justify-between items-baseline">
        <span className="text-sm font-semibold text-gray-700">Total</span>
        <span className="text-3xl font-bold text-green-600">${total.toLocaleString()}</span>
      </div>
    </div>
  );
};
