/** Gold floor applied each turn to human-controlled countries when GameConfig.unlimitedGold is true. */
export const UNLIMITED_GOLD_FLOOR = 999_999;

export const DEFAULT_PROVINCE_MONEY_YIELD = 5;

/** Every non-city province is worth 1 VP by default (see state/Province.ts, rules/winConditions.ts). */
export const DEFAULT_PROVINCE_VP = 1;

/**
 * VP needed to win. The source game's thresholds (per the wiki) run
 * 1,000-8,600+ for full world maps with many nations; scaled way down here
 * since our sandbox world's detailed conflict zone (Western/Central Europe,
 * ~120 provinces) tops out around ~250 total VP if fully conquered.
 */
export const DEFAULT_VICTORY_POINT_TARGET = 250;

// ---- Morale (see state/Province.ts, turn/moraleResolver.ts) ----

/** Fresh nations start at full morale — it only becomes a concern once territory changes hands. */
export const STARTING_MORALE = 100;
/** Morale a province drops to the moment it's captured. */
export const CAPTURED_MORALE = 25;
/** Long-run morale target on your own homeland. */
export const HOMELAND_MORALE_TARGET = 100;
/** Long-run morale target on occupied territory — per the wiki it rises only slowly and stays low. */
export const OCCUPIED_MORALE_TARGET = 45;
/** Morale points of drift toward the target per simulated day. */
export const MORALE_DRIFT_PER_DAY = 24;
/** Occupied land below this morale can rise up (wiki: "less than 35% morale, chance for an uprising"). */
export const UPRISING_MORALE_THRESHOLD = 35;
/** Probability per simulated day that a qualifying province revolts (only when ungarrisoned). */
export const UPRISING_CHANCE_PER_DAY = 0.25;
/** Morale right after a successful uprising returns the province to its homeland. */
export const UPRISING_RESET_MORALE = 50;
/** Gold price of the city panel's smiley button. */
export const MORALE_BOOST_GOLD_COST = 500;
/** Morale gained per gold boost. */
export const MORALE_BOOST_AMOUNT = 10;
/** Occupied territory produces at a quarter rate, per the wiki's production table. */
export const OCCUPIED_PRODUCTION_FACTOR = 0.25;
/** Health regained per simulated day by units garrisoned in a friendly city. */
export const CITY_HEAL_PER_DAY = 10;
