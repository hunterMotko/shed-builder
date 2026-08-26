/**
 * Pricing Utilities
 *
 * Authoritative price data from shed-options.md.
 * Base prices are fixed per width×length×Tier combination.
 * Add-on prices are fixed per item/unit.
 */

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

export const PRICE_TABLE = {
  // Standard barns
  '10x12xStandard': 4689,
  '10x16xStandard': 5189,
  '10x20xStandard': 5689,
  '12x12xStandard': 5589,
  '12x16xStandard': 6089,
  '12x20xStandard': 6589,
  '12x24xStandard': 7089,
  // Deluxe barns & gables
  '10x12xDeluxe': 5789,
  '10x16xDeluxe': 6389,
  '10x20xDeluxe': 6989,
  '12x12xDeluxe': 5989,
  '12x16xDeluxe': 6389,
  '12x20xDeluxe': 7189,
  '12x24xDeluxe': 7789,
  '12x26xDeluxe': 8389,
  '12x32xDeluxe': 8989,
  '14x20xDeluxe': 11189,
  '14x24xDeluxe': 11789,
  '14x28xDeluxe': 12389,
  '14x32xDeluxe': 12989,
  '14x36xDeluxe': 13589,
  '16x24xDeluxe': 12189,
  '16x28xDeluxe': 12789,
  '16x32xDeluxe': 13389,
  '16x36xDeluxe': 13989,
};

// ─── Add-on price constants ──────────────────────────────────────────────────

export const OPTION_PRICES = {
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
