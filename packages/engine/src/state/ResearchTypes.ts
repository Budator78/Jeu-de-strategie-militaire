import type { ResourceAmounts } from "./ResourceTypes";
import type { UnitTypeId } from "./UnitTypes";

/**
 * A small starting roster (the source game has a much larger tech tree across
 * three eras — 1980s/90s, 2000s, ultra-modern). One upgrade per unit type here,
 * applying a permanent attack/defense bonus baked into newly built units.
 */
export type ResearchId = "infantryTier2" | "tankTier2" | "fighterTier2";

export interface ResearchDef {
  id: ResearchId;
  name: string;
  unitType: UnitTypeId;
  /** Per the wiki: research costs supplies, rare materials, and money. */
  cost: ResourceAmounts;
  researchTimeMs: number;
  attackBonus: number;
  defenseBonus: number;
}

export const RESEARCH_TYPES: Record<ResearchId, ResearchDef> = {
  infantryTier2: {
    id: "infantryTier2",
    name: "Infantry Tier 2",
    unitType: "infantry",
    cost: { supplies: 200, rareMaterials: 100, money: 500 },
    researchTimeMs: 2 * 60 * 60 * 1000,
    attackBonus: 0.25,
    defenseBonus: 0.25,
  },
  tankTier2: {
    id: "tankTier2",
    name: "Armor Tier 2",
    unitType: "tank",
    cost: { supplies: 150, rareMaterials: 200, money: 700 },
    researchTimeMs: 3 * 60 * 60 * 1000,
    attackBonus: 0.25,
    defenseBonus: 0.25,
  },
  fighterTier2: {
    id: "fighterTier2",
    name: "Air Superiority Tier 2",
    unitType: "fighter",
    cost: { supplies: 150, rareMaterials: 250, money: 800 },
    researchTimeMs: 3 * 60 * 60 * 1000,
    attackBonus: 0.25,
    defenseBonus: 0.25,
  },
};

/** Per the wiki: at most two researches may be in progress for a country at once. */
export const MAX_CONCURRENT_RESEARCH = 2;
