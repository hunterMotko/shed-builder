/**
 * Pricing Utilities
 *
 * Authoritative price data from shed-options.md.
 * Base prices are fixed per width×length×wallHeight combination.
 * Add-on prices are fixed per item/unit.
 */

// ─── Base price lookup table ─────────────────────────────────────────────────
// Key format: `${width}x${length}x${wallHeight}`

export const PRICE_TABLE = {
  // Standard barns — 10ft wall
  '10x12x10': 4689,
  '10x16x10': 5189,
  '10x20x10': 5689,
  '12x12x10': 5589,
  '12x16x10': 6089,
  '12x20x10': 6589,
  '12x24x10': 7089,
  // Deluxe barns & gables — 11ft wall
  '10x12x11': 5789,
  '10x16x11': 6389,
  '10x20x11': 6989,
  '12x12x11': 5989,
  '12x16x11': 6389,
  '12x20x11': 7189,
  '12x24x11': 7789,
  '12x26x11': 8389,
  '12x32x11': 8989,
  '14x20x11': 11189,
  '14x24x11': 11789,
  '14x28x11': 12389,
  '14x32x11': 12989,
  '14x36x11': 13589,
  '16x24x11': 12189,
  '16x28x11': 12789,
  '16x32x11': 13389,
  '16x36x11': 13989,
  // Special — 12ft wall
  '14x28x12': 13189,
  '16x36x12': 14789,
};

// ─── Add-on price constants ──────────────────────────────────────────────────

export const ADD_ON_PRICES = {
  garage_door_6x7:          450,
  garage_door_8x7:          500,   // $450 base + 2ft × $25/ft
  garage_door_additional:   600,
  entry_door_steel:         375,
  entry_door_nine_light:    425,
  window_vinyl_slide:       275,   // per window
  window_octagon:            85,
  skylight_per_ft:            5,   // per running foot
  shutters_per_pair:         70,
  ramp_small:               275,   // 6–8ft × 4ft
  ramp_large:               325,   // 8–10ft × 4ft
  vent_octagon:              85,
  workbench_per_ft:          35,   // per running foot
  pegboard_per_sheet:        70,   // 4x8 white sheet
  loft_per_sqft:              4,   // loft / shelving
};

// ─── Derived helpers ─────────────────────────────────────────────────────────

/**
 * All unique widths available in the catalog.
 */
export const CATALOG_WIDTHS = [...new Set(
  Object.keys(PRICE_TABLE).map((k) => parseInt(k.split('x')[0], 10))
)].sort((a, b) => a - b);

/**
 * Returns wall heights available for a given width.
 */
export function getAvailableHeights(width) {
  return [...new Set(
    Object.keys(PRICE_TABLE)
      .filter((k) => k.startsWith(`${width}x`))
      .map((k) => parseInt(k.split('x')[2], 10))
  )].sort((a, b) => a - b);
}

/**
 * Returns lengths available for a given width + wallHeight combination.
 */
export function getAvailableLengths(width, wallHeight) {
  return Object.keys(PRICE_TABLE)
    .filter((k) => k.startsWith(`${width}x`) && k.endsWith(`x${wallHeight}`))
    .map((k) => parseInt(k.split('x')[1], 10))
    .sort((a, b) => a - b);
}

/**
 * Returns true if the given combo exists in the price table.
 */
export function isValidCombo(width, length, wallHeight) {
  return `${width}x${length}x${wallHeight}` in PRICE_TABLE;
}

/**
 * Returns the base price for a combo, or null if not in the table.
 */
export function lookupBasePrice(width, length, wallHeight) {
  return PRICE_TABLE[`${width}x${length}x${wallHeight}`] ?? null;
}

/**
 * Human-readable tier name for a given wall height.
 */
export function getShedTier(wallHeight) {
  if (wallHeight === 10) return 'Standard';
  if (wallHeight === 11) return 'Deluxe';
  if (wallHeight === 12) return 'Special';
  return '';
}

/**
 * Snaps to the nearest valid combo when a dimension changes.
 * Prefers same width & wallHeight; picks the closest available length.
 */
export function snapToValidCombo(width, length, wallHeight) {
  // First try exact match
  if (isValidCombo(width, length, wallHeight)) return { width, length, wallHeight };

  // Try same width + wallHeight with closest length
  const lengths = getAvailableLengths(width, wallHeight);
  if (lengths.length > 0) {
    const closest = lengths.reduce((a, b) =>
      Math.abs(b - length) < Math.abs(a - length) ? b : a
    );
    return { width, length: closest, wallHeight };
  }

  // Try same width with first available height and its first length
  const heights = getAvailableHeights(width);
  if (heights.length > 0) {
    const h = heights[0];
    const ls = getAvailableLengths(width, h);
    return { width, length: ls[0], wallHeight: h };
  }

  // Fallback to first entry in the table
  const first = Object.keys(PRICE_TABLE)[0].split('x').map(Number);
  return { width: first[0], length: first[1], wallHeight: first[2] };
}

// ─── Add-on total ────────────────────────────────────────────────────────────

/**
 * Returns the itemized add-on cost breakdown as an array of { label, amount } lines.
 * Only includes enabled add-ons.
 */
export function getAddOnLineItems(addOns) {
  const lines = [];

  if (addOns.garageDoor?.enabled) {
    const key = addOns.garageDoor.size === '8x7' ? 'garage_door_8x7' : 'garage_door_6x7';
    lines.push({ label: `${addOns.garageDoor.size} Roll-Up Garage Door`, amount: ADD_ON_PRICES[key] });
  }
  if (addOns.additionalDoor?.enabled) {
    lines.push({ label: 'Additional Garage Door', amount: ADD_ON_PRICES.garage_door_additional });
  }
  if (addOns.entryDoor?.enabled) {
    const key = addOns.entryDoor.type === 'nine_light' ? 'entry_door_nine_light' : 'entry_door_steel';
    const label = addOns.entryDoor.type === 'nine_light' ? '36in Nine-Light Entry Door' : '36in Steel Entry Door';
    lines.push({ label, amount: ADD_ON_PRICES[key] });
  }
  if (addOns.vinylWindows?.enabled) {
    const count = addOns.vinylWindows.count || 1;
    lines.push({
      label: `${count}× Vinyl Slide Window${count > 1 ? 's' : ''}`,
      amount: ADD_ON_PRICES.window_vinyl_slide * count,
    });
  }
  if (addOns.octagonWindow?.enabled) {
    lines.push({ label: 'Octagon Gable Window', amount: ADD_ON_PRICES.window_octagon });
  }
  if (addOns.skylight?.enabled) {
    const ft = addOns.skylight.runningFt || 0;
    lines.push({ label: `Ridge Skylight (${ft} ft)`, amount: ADD_ON_PRICES.skylight_per_ft * ft });
  }
  if (addOns.shutters?.enabled) {
    const pairs = addOns.shutters.pairs || 1;
    lines.push({
      label: `${pairs}× Vinyl Shutter Pair${pairs > 1 ? 's' : ''}`,
      amount: ADD_ON_PRICES.shutters_per_pair * pairs,
    });
  }
  if (addOns.ramp?.enabled) {
    const key = addOns.ramp.size === 'large' ? 'ramp_large' : 'ramp_small';
    const label = addOns.ramp.size === 'large' ? 'Access Ramp (8–10×4ft)' : 'Access Ramp (6–8×4ft)';
    lines.push({ label, amount: ADD_ON_PRICES[key] });
  }
  if (addOns.workbench?.enabled) {
    const ft = addOns.workbench.runningFt || 0;
    lines.push({ label: `Workbench (${ft} ft)`, amount: ADD_ON_PRICES.workbench_per_ft * ft });
  }
  if (addOns.pegboard?.enabled) {
    const sheets = addOns.pegboard.sheets || 0;
    lines.push({
      label: `${sheets}× Pegboard Sheet${sheets === 1 ? '' : 's'}`,
      amount: ADD_ON_PRICES.pegboard_per_sheet * sheets,
    });
  }
  if (addOns.loft?.enabled) {
    const sqft = addOns.loft.sqft || 0;
    lines.push({ label: `Loft / Shelving (${sqft} sq ft)`, amount: ADD_ON_PRICES.loft_per_sqft * sqft });
  }
  if (addOns.octagonVent?.enabled) {
    lines.push({ label: 'Vinyl Octagon Gable Vent', amount: ADD_ON_PRICES.vent_octagon });
  }

  return lines;
}

export function calculateAddOnTotal(addOns) {
  return getAddOnLineItems(addOns).reduce((sum, item) => sum + item.amount, 0);
}

/**
 * Full total price: base lookup + all enabled add-ons.
 */
export function calculateTotalPrice(width, length, wallHeight, addOns = {}) {
  const base = lookupBasePrice(width, length, wallHeight) ?? 0;
  return base + calculateAddOnTotal(addOns);
}

// ─── Formatting helpers (unchanged API) ─────────────────────────────────────

export const formatPrice = (price, decimals = 2) => price.toFixed(decimals);

export const formatPriceWithCurrency = (price, decimals = 2) =>
  `$${formatPrice(price, decimals)}`;
