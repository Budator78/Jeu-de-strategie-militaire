import type { ResourceAmounts } from "./ResourceTypes";

/**
 * A small starting roster (the source game has 100+ unit types across 11
 * categories). Infantry/Armored/Fighter cover land+air basics; per the wiki,
 * only infantry (excluding Special Forces/Mercenary) can capture territory.
 */
export type UnitTypeId = "infantry" | "tank" | "fighter";

export interface UnitTypeDef {
  id: UnitTypeId;
  name: string;
  domain: "land" | "air";
  cost: ResourceAmounts;
  buildTimeMs: number;
  /** Time to move into one adjacent province. */
  moveTimeMs: number;
  attack: number;
  defense: number;
  health: number;
  canCapture: boolean;
  /**
   * Ongoing per-minute maintenance cost (per the wiki: "the more units your
   * army has, the more you need to feed and supply them"). Without this, an
   * AI (or player) can spam units forever with no economic pressure valve.
   */
  upkeepPerMin: ResourceAmounts;
}

export const UNIT_TYPES: Record<UnitTypeId, UnitTypeDef> = {
  infantry: {
    id: "infantry",
    name: "Motorized Infantry",
    domain: "land",
    cost: { manpower: 20, supplies: 15 },
    buildTimeMs: 60_000,
    moveTimeMs: 30_000,
    attack: 8,
    defense: 10,
    health: 100,
    canCapture: true,
    upkeepPerMin: { supplies: 0.5, manpower: 0.2 },
  },
  tank: {
    id: "tank",
    name: "Main Battle Tank",
    domain: "land",
    cost: { manpower: 15, components: 25 },
    buildTimeMs: 120_000,
    moveTimeMs: 20_000,
    attack: 16,
    defense: 12,
    health: 100,
    canCapture: false,
    upkeepPerMin: { fuel: 0.8, components: 0.2 },
  },
  fighter: {
    id: "fighter",
    name: "Air Superiority Fighter",
    domain: "air",
    cost: { manpower: 10, electronics: 30 },
    buildTimeMs: 150_000,
    moveTimeMs: 10_000,
    attack: 14,
    defense: 6,
    health: 100,
    canCapture: false,
    upkeepPerMin: { fuel: 1.2, electronics: 0.3 },
  },
};
