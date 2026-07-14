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
