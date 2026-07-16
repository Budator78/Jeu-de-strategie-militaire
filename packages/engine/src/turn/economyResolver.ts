import { produce } from "immer";
import { BUILDING_TYPES } from "../state/BuildingTypes";
import type { GameState } from "../state/GameState";
import type { Province } from "../state/Province";
import type { ResourceType } from "../state/ResourceTypes";
import { UNIT_TYPES } from "../state/UnitTypes";
import { ANNEXED_PRODUCTION_FACTOR, OCCUPIED_PRODUCTION_FACTOR } from "../rules/balance";

const MS_PER_MINUTE = 60_000;

const ALL_RESOURCES: ResourceType[] = [
  "supplies",
  "components",
  "fuel",
  "electronics",
  "rareMaterials",
  "manpower",
  "money",
];

function buildingBonusMultiplier(province: Province, resource: ResourceType): number {
  let multiplier = 1;
  for (const buildingId of province.buildings) {
    multiplier += BUILDING_TYPES[buildingId].resourceBonus[resource] ?? 0;
  }
  return multiplier;
}

/**
 * Morale/occupation scaling applied on top of a province's base yield:
 * morale% × (1 on homeland, OCCUPIED_PRODUCTION_FACTOR elsewhere), per the
 * wiki's production table. Exported so the UI can show effective rates.
 */
export function provinceYieldMultiplier(province: Province): number {
  let statusFactor: number;
  if (province.ownerId === province.homelandOf) {
    statusFactor = 1;
  } else {
    // Occupied — an Annex City building lifts it from a quarter to a half.
    statusFactor = province.buildings.includes("annexCity")
      ? ANNEXED_PRODUCTION_FACTOR
      : OCCUPIED_PRODUCTION_FACTOR;
  }
  return (province.morale / 100) * statusFactor;
}

function computeIncomePerMinute(
  state: GameState,
  countryId: string,
): Partial<Record<ResourceType, number>> {
  const income: Partial<Record<ResourceType, number>> = {};
  for (const province of Object.values(state.provinces)) {
    if (province.ownerId !== countryId) continue;
    const yieldMultiplier = provinceYieldMultiplier(province);
    for (const [resource, amount] of Object.entries(province.resources)) {
      const key = resource as ResourceType;
      const withBonus = (amount ?? 0) * buildingBonusMultiplier(province, key) * yieldMultiplier;
      income[key] = (income[key] ?? 0) + withBonus;
    }
  }
  return income;
}

/**
 * Per the wiki ("the more units your army has, the more you need to feed and
 * supply them"): every unit costs a small per-minute upkeep. Without this, an
 * army can grow forever with no economic cost — this is what naturally caps
 * army size once maintaining it outpaces production.
 */
function computeUpkeepPerMinute(
  state: GameState,
  countryId: string,
): Partial<Record<ResourceType, number>> {
  const upkeep: Partial<Record<ResourceType, number>> = {};
  for (const unit of Object.values(state.units)) {
    if (unit.ownerId !== countryId) continue;
    for (const [resource, amount] of Object.entries(UNIT_TYPES[unit.type].upkeepPerMin)) {
      const key = resource as ResourceType;
      upkeep[key] = (upkeep[key] ?? 0) + (amount ?? 0);
    }
  }
  return upkeep;
}

/**
 * Net per-minute rate (province income with building bonuses, minus unit
 * upkeep) for every standard resource. Exported so the UI can show live
 * "+X /h" rates next to each stockpile without re-deriving the economy rules.
 */
export function computeNetIncomePerMinute(
  state: GameState,
  countryId: string,
): Record<ResourceType, number> {
  const income = computeIncomePerMinute(state, countryId);
  const upkeep = computeUpkeepPerMinute(state, countryId);
  const net = {} as Record<ResourceType, number>;
  for (const key of ALL_RESOURCES) {
    net[key] = (income[key] ?? 0) - (upkeep[key] ?? 0);
  }
  return net;
}

/**
 * Adds each country's province income (supplies, components, fuel,
 * electronics, rare materials, manpower, money — all expressed as per-minute
 * rates on Province.resources, boosted by any buildings present), then
 * subtracts unit upkeep, proportional to elapsedMs. Resources never go
 * negative — an unpaid army just stalls further growth (new builds are
 * already gated by affordability) rather than being force-disbanded. Gold is
 * handled separately in goldResolver.ts — it isn't produced by provinces.
 */
export function resolveEconomy(state: GameState, elapsedMs: number): GameState {
  if (elapsedMs <= 0) return state;
  return produce(state, (draft) => {
    for (const country of Object.values(draft.countries)) {
      if (!country.alive) continue;
      const netPerMinute = computeNetIncomePerMinute(state, country.id);
      for (const key of ALL_RESOURCES) {
        const delta = netPerMinute[key] * (elapsedMs / MS_PER_MINUTE);
        country.resources[key] = Math.max(0, (country.resources[key] ?? 0) + delta);
      }
    }
  });
}
