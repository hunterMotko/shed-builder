/**
 * Pricing Utilities
 *
 * Authoritative price data from shed-options.md.
 * Base prices are fixed per width×length×Tier combination.
 * Add-on prices are fixed per item/unit.
 *
 * The numbers themselves live in `catalog.json` at the repo root — one file, imported
 * here and embedded into the Go server at compile time. They used to be typed
 * out in both places, and nothing but diligence kept the two in step (issue
 * #8). There is no fetch: the import is resolved at build time, so a price is
 * available synchronously and `snapToValidCombo` still cannot be asked a
 * question it has no answer for.
 *
 * The derived helpers below stay here — they are how this app asks questions
 * of the catalog, not part of the catalog itself.
 */

import catalog from '../../../catalog.json';
import { octagonEnds } from './gableEndOpenings';

// ─── Base price lookup table ─────────────────────────────────────────────────
// Key format: `${width}x${length}x${tier}`
//
// The catalog used to key on the height, because a Standard was 10ft and a
// Deluxe 11ft. The 10ft build is retired — every size is 11ft to the peak now —
// so the height carries no information and all seven Standard sizes would
// collide with their Deluxe twin. Tier is the axis that actually separates
// them, and always was: a Standard is 2x4 rafters, 16in joists and swing barn
// doors; a Deluxe is 2x6, 12in and a roll-up.

export const TIERS = ['Standard', 'Deluxe'];

/** Every size in the catalog is 11ft to the peak. Nominal — see CONTEXT.md. */
export const CATALOG_PEAK_HEIGHT = 11;

/**
 * Base price by `${width}x${length}x${tier}`. 25 combinations, not a formula:
 * there is no square-foot rate and no Model surcharge.
 */
export const PRICE_TABLE = catalog.basePrices;

// ─── Add-on price constants ──────────────────────────────────────────────────

/** Option prices, per item or per unit (per foot, sheet, pair, sqft). */
export const OPTION_PRICES = catalog.optionPrices;

// ─── Derived helpers ─────────────────────────────────────────────────────────

/**
 * All unique widths available in the catalog.
 */
export const CATALOG_WIDTHS = [...new Set(
  Object.keys(PRICE_TABLE).map((k) => parseInt(k.split('x')[0], 10))
)].sort((a, b) => a - b);

/**
 * The Tiers each Model is sold at.
 *
 * A Gable is **Deluxe only**. The price list says so in its headings — "Standard
 * barn prices", then "Deluxe barns & gables" — and there is no Standard gable in
 * the table. It is not a pricing quirk: a Standard is the barn package, 2x4
 * rafters and 16in joists and double swing barn doors, and the shop does not
 * build a gable that way.
 *
 * In the catalog rather than in code so the Go server reads the same rule
 * (issue #8). It is also geometry now — a Deluxe's 2x6 rafters give it a 6in
 * roof edge — so a Standard Gable is not merely unpriced, it is a shed that
 * would be drawn wrong.
 */
export const MODEL_TIERS = catalog.modelTiers;

/** The Tiers one Model is sold at, before any width narrows it further. */
export function tiersForModel(model) {
  return MODEL_TIERS[model] ?? TIERS;
}

/** Whether the catalog sells this Model at this Tier at all. */
export function isSoldAsTier(model, tier) {
  return tiersForModel(model).includes(tier);
}

/**
 * Returns the Tiers a given width is sold in for a Model.
 *
 * Two rules narrow it, and they are different rules: a Gable is Deluxe whatever
 * its size, and a 14 or 16 wide is Deluxe whatever its Model.
 */
export function getAvailableTiers(width, model) {
  return tiersForModel(model).filter((tier) =>
    Object.keys(PRICE_TABLE).some((k) => k.startsWith(`${width}x`) && k.endsWith(`x${tier}`))
  );
}

/**
 * Returns lengths available for a given width + Tier combination.
 */
export function getAvailableLengths(width, tier) {
  return Object.keys(PRICE_TABLE)
    .filter((k) => k.startsWith(`${width}x`) && k.endsWith(`x${tier}`))
    .map((k) => parseInt(k.split('x')[1], 10))
    .sort((a, b) => a - b);
}

/**
 * Returns true if the given combo exists in the price table.
 *
 * A price-table question, and only that: the table is not keyed by Model, so
 * this says nothing about whether the Model is sold at that Tier. Ask
 * `isSoldAsTier` as well — `12x16xStandard` is a real price, for a Barn.
 */
export function isValidCombo(width, length, tier) {
  return `${width}x${length}x${tier}` in PRICE_TABLE;
}

/**
 * Returns the base price for a combo, or null if not in the table.
 */
export function lookupBasePrice(width, length, tier) {
  return PRICE_TABLE[`${width}x${length}x${tier}`] ?? null;
}

/**
 * Snaps to the nearest combo the catalog actually sells.
 *
 * The Model is part of the question, not decoration: a Gable is Deluxe only, so
 * asking for a Standard one has to land on a Deluxe rather than on a price that
 * belongs to a Barn. Every Standard size is also sold as a Deluxe, so moving a
 * Gable up a grade never costs it its size.
 */
export function snapToValidCombo(width, length, tier, model) {
  // The Model's rule comes first: a Tier it is not sold at is not a starting
  // point to search from, it is a wrong answer to correct before searching.
  const sold = getAvailableTiers(width, model);
  const wanted = sold.includes(tier) ? tier : sold[0];

  if (wanted !== undefined) {
    if (isValidCombo(width, length, wanted)) return { width, length, tier: wanted };

    // Same width and grade, closest length.
    const lengths = getAvailableLengths(width, wanted);
    if (lengths.length > 0) {
      const closest = lengths.reduce((a, b) =>
        Math.abs(b - length) < Math.abs(a - length) ? b : a
      );
      return { width, length: closest, tier: wanted };
    }
  }

  // The width is sold at no grade this Model comes in. Fall back to the first
  // combination that is — a Model is a stronger choice than a size, and a
  // customer who picked one should not be handed the other Model's shed.
  const fallback = Object.keys(PRICE_TABLE).find((k) =>
    isSoldAsTier(model, k.split('x')[2])
  ) ?? Object.keys(PRICE_TABLE)[0];
  const [w, l, t] = fallback.split('x');
  return { width: Number(w), length: Number(l), tier: t };
}

// ─── Add-on total ────────────────────────────────────────────────────────────

/**
 * Returns the itemized add-on cost breakdown as an array of { label, amount } lines.
 * Only includes enabled Options.
 */
/** Names the ends on a line item, so a doubled charge reads as one. */
const endLabel = (name, ends) =>
  ends.length > 1 ? `${name} (front and back)` : `${name} (${ends[0]})`;

export function getOptionLineItems(options) {
  const lines = [];

  if (options.garageDoor?.enabled) {
    const key = options.garageDoor.size === '8x7' ? 'garage_door_8x7' : 'garage_door_6x7';
    lines.push({ label: `${options.garageDoor.size} Roll-Up Garage Door`, amount: OPTION_PRICES[key] });
  }
  if (options.additionalDoor?.enabled) {
    lines.push({ label: 'Additional Garage Door', amount: OPTION_PRICES.garage_door_additional });
  }
  if (options.entryDoor?.enabled) {
    const key = options.entryDoor.type === 'nine_light' ? 'entry_door_nine_light' : 'entry_door_steel';
    const label = options.entryDoor.type === 'nine_light' ? '36in Nine-Light Entry Door' : '36in Steel Entry Door';
    lines.push({ label, amount: OPTION_PRICES[key] });
  }
  if (options.vinylWindows?.enabled) {
    const count = options.vinylWindows.count || 1;
    lines.push({
      label: `${count}× Vinyl Slide Window${count > 1 ? 's' : ''}`,
      amount: OPTION_PRICES.window_vinyl_slide * count,
    });
  }
  // Priced per end, not per tick: a shed has two gables and a customer may
  // buy an octagon in either or both (issue #43).
  const octagonWindowEnds = octagonEnds(options.octagonWindow);
  if (octagonWindowEnds.length) {
    lines.push({
      label: endLabel('Octagon Gable Window', octagonWindowEnds),
      amount: OPTION_PRICES.window_octagon * octagonWindowEnds.length,
    });
  }
  if (options.skylight?.enabled) {
    const ft = options.skylight.runningFt || 0;
    lines.push({ label: `Ridge Skylight (${ft} ft)`, amount: OPTION_PRICES.skylight_per_ft * ft });
  }
  if (options.shutters?.enabled) {
    const pairs = options.shutters.pairs || 1;
    lines.push({
      label: `${pairs}× Vinyl Shutter Pair${pairs > 1 ? 's' : ''}`,
      amount: OPTION_PRICES.shutters_per_pair * pairs,
    });
  }
  if (options.ramp?.enabled) {
    const key = options.ramp.size === 'large' ? 'ramp_large' : 'ramp_small';
    const label = options.ramp.size === 'large' ? 'Access Ramp (8–10×4ft)' : 'Access Ramp (6–8×4ft)';
    lines.push({ label, amount: OPTION_PRICES[key] });
  }
  if (options.workbench?.enabled) {
    const ft = options.workbench.runningFt || 0;
    lines.push({ label: `Workbench (${ft} ft)`, amount: OPTION_PRICES.workbench_per_ft * ft });
  }
  if (options.pegboard?.enabled) {
    const sheets = options.pegboard.sheets || 0;
    lines.push({
      label: `${sheets}× Pegboard Sheet${sheets === 1 ? '' : 's'}`,
      amount: OPTION_PRICES.pegboard_per_sheet * sheets,
    });
  }
  if (options.loft?.enabled) {
    const sqft = options.loft.sqft || 0;
    lines.push({ label: `Loft / Shelving (${sqft} sq ft)`, amount: OPTION_PRICES.loft_per_sqft * sqft });
  }
  const octagonVentEnds = octagonEnds(options.octagonVent);
  if (octagonVentEnds.length) {
    lines.push({
      label: endLabel('Vinyl Octagon Gable Vent', octagonVentEnds),
      amount: OPTION_PRICES.vent_octagon * octagonVentEnds.length,
    });
  }

  return lines;
}

export function calculateOptionTotal(options) {
  return getOptionLineItems(options).reduce((sum, item) => sum + item.amount, 0);
}

/**
 * Full total price: base lookup + all enabled Options.
 */
export function calculateTotalPrice(width, length, tier, options = {}) {
  const base = lookupBasePrice(width, length, tier) ?? 0;
  return base + calculateOptionTotal(options);
}

// ─── Formatting helpers (unchanged API) ─────────────────────────────────────

export const formatPrice = (price, decimals = 2) => price.toFixed(decimals);

export const formatPriceWithCurrency = (price, decimals = 2) =>
  `$${formatPrice(price, decimals)}`;
