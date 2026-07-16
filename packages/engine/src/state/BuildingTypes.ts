import type { Province } from "./Province";
import type { ResourceAmounts, ResourceType } from "./ResourceTypes";

/**
 * Buildings from the wiki's Buildings page, grouped by where they go:
 * city buildings, province buildings, and Annex City (occupied cities only).
 * Each one has a real simulated effect (production, garrison defense,
 * healing, or a mobilization gate) rather than being cosmetic.
 */
export type BuildingId =
  | "armsIndustry"
  | "recruitingOffice"
  | "localIndustry"
  | "annexCity"
  | "armyBase"
  | "airBase"
  | "militaryHospital"
  | "fieldHospital"
  | "undergroundBunkers"
  | "combatOutpost";

export type BuildingPlacement = "homelandCity" | "occupiedCity" | "anyCity" | "province";

export interface BuildingDef {
  id: BuildingId;
  name: string;
  placement: BuildingPlacement;
  cost: ResourceAmounts;
  buildTimeMs: number;
  /** Fractional bonus applied to matching per-minute resource yields (0.1 = +10%) — see turn/economyResolver.ts. */
  resourceBonus: Partial<Record<ResourceType, number>>;
  /** Fractional defense bonus for units garrisoned here (combat) — see turn/ordersResolver.ts. */
  defenseBonus?: number;
  /** Extra healing (hp/simulated-day) for units here, on top of the friendly-city base. */
  healBonusPerDay?: number;
  /** Lets a non-city province heal friendly units (province healing is otherwise city-only). */
  enablesProvinceHealing?: boolean;
  /** Air units (fighter/gunship/attackHelicopter) can only be mobilized in a city that has this. */
  enablesAirMobilization?: boolean;
  /** Annex City: an occupied city produces at 50% instead of 25% (see rules/balance.ts). */
  annexes?: boolean;
}

const HOUR = 60 * 60 * 1000;

export const BUILDING_TYPES: Record<BuildingId, BuildingDef> = {
  armsIndustry: {
    id: "armsIndustry",
    name: "Arms Industry",
    placement: "anyCity",
    // Level 1 stats per the wiki.
    cost: { supplies: 400, components: 350, electronics: 225, fuel: 350, rareMaterials: 250, money: 1250 },
    buildTimeMs: 9 * HOUR,
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
    placement: "anyCity",
    cost: { supplies: 150, money: 400 },
    buildTimeMs: 3 * HOUR,
    resourceBonus: { manpower: 0.25 },
  },
  // Province building: boosts the raw yields of a non-city province.
  localIndustry: {
    id: "localIndustry",
    name: "Local Industry",
    placement: "province",
    cost: { supplies: 120, components: 80, money: 300 },
    buildTimeMs: 4 * HOUR,
    resourceBonus: {
      supplies: 0.25,
      components: 0.25,
      fuel: 0.25,
      electronics: 0.25,
      rareMaterials: 0.25,
    },
  },
  // Occupied-city only: raises production from 25% to 50% (see wiki: annexing).
  annexCity: {
    id: "annexCity",
    name: "Annex City",
    placement: "occupiedCity",
    cost: { manpower: 200, money: 800 },
    buildTimeMs: 6 * HOUR,
    resourceBonus: {},
    annexes: true,
  },
  // City building: fortifies the garrison (defense) — cities need one before
  // fielding a serious army; here it just hardens the defenders.
  armyBase: {
    id: "armyBase",
    name: "Army Base",
    placement: "homelandCity",
    cost: { supplies: 250, components: 150, fuel: 150, money: 600 },
    buildTimeMs: 5 * HOUR,
    resourceBonus: {},
    defenseBonus: 0.25,
  },
  // City building: unlocks mobilizing air units in this city.
  airBase: {
    id: "airBase",
    name: "Air Base",
    placement: "homelandCity",
    cost: { supplies: 200, components: 200, electronics: 200, fuel: 200, money: 800 },
    buildTimeMs: 6 * HOUR,
    resourceBonus: {},
    enablesAirMobilization: true,
  },
  // City building: speeds up healing of the garrison.
  militaryHospital: {
    id: "militaryHospital",
    name: "Military Hospital",
    placement: "anyCity",
    cost: { supplies: 200, electronics: 100, money: 500 },
    buildTimeMs: 4 * HOUR,
    resourceBonus: {},
    healBonusPerDay: 20,
  },
  // Province building: lets a non-city province heal friendly units.
  fieldHospital: {
    id: "fieldHospital",
    name: "Field Hospital",
    placement: "province",
    cost: { supplies: 120, money: 250 },
    buildTimeMs: 2 * HOUR,
    resourceBonus: {},
    enablesProvinceHealing: true,
    healBonusPerDay: 5,
  },
  // City building: strong defensive fortification.
  undergroundBunkers: {
    id: "undergroundBunkers",
    name: "Underground Bunkers",
    placement: "anyCity",
    cost: { supplies: 300, components: 250, money: 700 },
    buildTimeMs: 7 * HOUR,
    resourceBonus: {},
    defenseBonus: 0.4,
  },
  // Province building: modest defensive outpost on open land.
  combatOutpost: {
    id: "combatOutpost",
    name: "Combat Outpost",
    placement: "province",
    cost: { supplies: 100, components: 60, money: 200 },
    buildTimeMs: 2 * HOUR,
    resourceBonus: {},
    defenseBonus: 0.2,
  },
};

/** Whether `buildingId` may be constructed in this province by `ownerId` (placement rules only, not cost/duplication). */
export function canPlaceBuilding(province: Province, ownerId: string, buildingId: BuildingId): boolean {
  if (province.ownerId !== ownerId) return false;
  const placement = BUILDING_TYPES[buildingId].placement;
  const isHomeland = province.homelandOf === ownerId;
  switch (placement) {
    case "homelandCity":
      return province.isCity && isHomeland;
    case "occupiedCity":
      return province.isCity && !isHomeland;
    case "anyCity":
      return province.isCity;
    case "province":
      return !province.isCity;
  }
}

/** Total fractional defense bonus from a province's defensive buildings. */
export function provinceDefenseBonus(province: Province): number {
  return province.buildings.reduce((sum, b) => sum + (BUILDING_TYPES[b].defenseBonus ?? 0), 0);
}
