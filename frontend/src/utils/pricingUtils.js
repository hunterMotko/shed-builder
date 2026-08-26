/**
 * Pricing Utilities
 *
 * Authoritative price data from shed-options.md.
 * Base prices are fixed per width×length×Tier combination.
 * Add-on prices are fixed per item/unit.
 *
 * The numbers themselves live in `backend/catalog.json` — one file, imported
 * here and embedded into the Go server at compile time. They used to be typed
 * out in both places, and nothing but diligence kept the two in step (issue
 * #8). There is no fetch: the import is resolved at build time, so a price is
 * available synchronously and `snapToValidCombo` still cannot be asked a
 * question it has no answer for.
 *
 * The file sits under `backend/` because `go:embed` cannot reach outside its
 * own module, and `go.mod` is there.
 *
 * The derived helpers below stay here — they are how this app asks questions
 * of the catalog, not part of the catalog itself.
 */

import catalog from '../../../backend/catalog.json';

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
 * Returns the Tiers a given width is sold in.
 */
export function getAvailableTiers(width) {
  return TIERS.filter((tier) =>
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
 * Snaps to the nearest valid combo when a dimension changes.
 * Prefers same width & Tier; picks the closest available length.
 */
export function snapToValidCombo(width, length, tier) {
  // First try exact match
  if (isValidCombo(width, length, tier)) return { width, length, tier };

  // Try same width + Tier with closest length
  const lengths = getAvailableLengths(width, tier);
  if (lengths.length > 0) {
    const closest = lengths.reduce((a, b) =>
      Math.abs(b - length) < Math.abs(a - length) ? b : a
    );
    return { width, length: closest, tier };
  }

  // Try same width in whichever Tier it is sold in. A 14 or 16 wide is Deluxe
  // only, so asking for a Standard one has to land somewhere.
  const tiers = getAvailableTiers(width);
  if (tiers.length > 0) {
    const t = tiers[0];
    const ls = getAvailableLengths(width, t);
    return { width, length: ls[0], tier: t };
  }

  // Fallback to first entry in the table
  const [w, l, t] = Object.keys(PRICE_TABLE)[0].split('x');
  return { width: Number(w), length: Number(l), tier: t };
}

// ─── Add-on total ────────────────────────────────────────────────────────────

/**
 * Returns the itemized add-on cost breakdown as an array of { label, amount } lines.
 * Only includes enabled Options.
 */
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
  if (options.octagonWindow?.enabled) {
    lines.push({ label: 'Octagon Gable Window', amount: OPTION_PRICES.window_octagon });
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
  if (options.octagonVent?.enabled) {
    lines.push({ label: 'Vinyl Octagon Gable Vent', amount: OPTION_PRICES.vent_octagon });
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
