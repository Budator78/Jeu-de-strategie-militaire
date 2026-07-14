import type { ResourceAmounts, ResourceType } from "./ResourceTypes";

/**
 * A small starting set (the source game has many more: Army/Air/Naval Base,
 * Secret Weapons Lab, Military Hospital, Underground Bunkers, etc.). Both
 * are city-only, per the wiki's Buildings page.
 */
export type BuildingId = "armsIndustry" | "recruitingOffice";

export interface BuildingDef {
  id: BuildingId;
  name: string;
  cost: ResourceAmounts;
  buildTimeMs: number;
  /** Fractional bonus applied to matching per-minute resource yields (e.g. 0.1 = +10%) — see turn/economyResolver.ts. */
  resourceBonus: Partial<Record<ResourceType, number>>;
}

export const BUILDING_TYPES: Record<BuildingId, BuildingDef> = {
  armsIndustry: {
    id: "armsIndustry",
    name: "Arms Industry",
    // Level 1 stats per the wiki.
    cost: { supplies: 400, components: 350, electronics: 225, fuel: 350, rareMaterials: 250, money: 1250 },
    buildTimeMs: 9 * 60 * 60 * 1000, // 9 hours, per the wiki
    resourceBonus: {
      supplies: 0.1,
      components: 0.1,
      electronics: 0.1,
      fuel: 0.1,
      rareMaterials: 0.1,
      money: 0.1,
    },
  },
  recruitingOffice: {
    id: "recruitingOffice",
    name: "Recruiting Office",
    // Not itemized on the wiki page read; a smaller/cheaper building than
    // Arms Industry, consistent with it only affecting one resource.
    cost: { supplies: 150, money: 400 },
    buildTimeMs: 3 * 60 * 60 * 1000,
    resourceBonus: { manpower: 0.25 },
  },
};
