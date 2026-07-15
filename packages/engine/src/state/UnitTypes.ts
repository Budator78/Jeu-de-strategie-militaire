import type { ResourceAmounts } from "./ResourceTypes";

/**
 * Growing roster (the source game has 100+ unit types across 11 categories).
 * Roles follow the wiki's unit descriptions; the numbers are our own,
 * calibrated to this engine's scale. Per the wiki, only infantry can capture
 * territory (excluding Special Forces/Mercenary, not modeled yet).
 */
export type UnitTypeId =
  | "infantry"
  | "nationalGuard"
  | "mechInfantry"
  | "recon"
  | "afv"
  | "tank"
  | "gunship"
  | "attackHelicopter"
  | "fighter";

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
  // Wiki: the most cost-effective but weakest infantry — a cheap defensive body.
  nationalGuard: {
    id: "nationalGuard",
    name: "National Guard",
    domain: "land",
    cost: { manpower: 15, supplies: 8 },
    buildTimeMs: 45_000,
    moveTimeMs: 35_000,
    attack: 5,
    defense: 8,
    health: 100,
    canCapture: true,
    upkeepPerMin: { supplies: 0.3, manpower: 0.1 },
  },
  // Wiki: lightly armored infantry, better against armor and mobile warfare.
  mechInfantry: {
    id: "mechInfantry",
    name: "Mechanized Infantry",
    domain: "land",
    cost: { manpower: 25, supplies: 10, components: 10, electronics: 5 },
    buildTimeMs: 90_000,
    moveTimeMs: 25_000,
    attack: 10,
    defense: 12,
    health: 100,
    canCapture: true,
    upkeepPerMin: { supplies: 0.5, fuel: 0.3 },
  },
  // Wiki: fast scout that needs no components to mobilize.
  recon: {
    id: "recon",
    name: "Combat Recon Vehicle",
    domain: "land",
    cost: { manpower: 10, supplies: 12, electronics: 8 },
    buildTimeMs: 75_000,
    moveTimeMs: 15_000,
    attack: 6,
    defense: 6,
    health: 100,
    canCapture: false,
    upkeepPerMin: { fuel: 0.4 },
  },
  // Wiki: armored vehicle optimized for fighting infantry.
  afv: {
    id: "afv",
    name: "Armored Fighting Vehicle",
    domain: "land",
    cost: { manpower: 12, components: 18, electronics: 8 },
    buildTimeMs: 100_000,
    moveTimeMs: 18_000,
    attack: 12,
    defense: 10,
    health: 100,
    canCapture: false,
    upkeepPerMin: { fuel: 0.6, components: 0.1 },
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
  // Wiki: medium-armed helicopter specialized against infantry; no components needed.
  gunship: {
    id: "gunship",
    name: "Helicopter Gunship",
    domain: "air",
    cost: { manpower: 8, supplies: 20, electronics: 10 },
    buildTimeMs: 130_000,
    moveTimeMs: 12_000,
    attack: 12,
    defense: 5,
    health: 100,
    canCapture: false,
    upkeepPerMin: { fuel: 1.0 },
  },
  // Wiki: heavily armed helicopter specialized against armor.
  attackHelicopter: {
    id: "attackHelicopter",
    name: "Attack Helicopter",
    domain: "air",
    cost: { manpower: 8, components: 20, electronics: 12 },
    buildTimeMs: 140_000,
    moveTimeMs: 12_000,
    attack: 15,
    defense: 6,
    health: 100,
    canCapture: false,
    upkeepPerMin: { fuel: 1.1, components: 0.2 },
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
