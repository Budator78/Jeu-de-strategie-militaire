import { produce } from "immer";
import { BUILDING_TYPES } from "../state/BuildingTypes";
import type { GameState } from "../state/GameState";
import type { Province } from "../state/Province";
import type { ResourceType } from "../state/ResourceTypes";
import { UNIT_TYPES } from "../state/UnitTypes";

const MS_PER_MINUTE = 60_000;

function buildingBonusMultiplier(province: Province, resource: ResourceType): number {
  let multiplier = 1;
  for (const buildingId of province.buildings) {
    multiplier += BUILDING_TYPES[buildingId].resourceBonus[resource] ?? 0;
  }
  return multiplier;
}

function computeIncomePerMinute(
  state: GameState,
  countryId: string,
): Partial<Record<ResourceType, number>> {
  const income: Partial<Record<ResourceType, number>> = {};
  for (const province of Object.values(state.provinces)) {
    if (province.ownerId !== countryId) continue;
    for (const [resource, amount] of Object.entries(province.resources)) {
      const key = resource as ResourceType;
      const withBonus = (amount ?? 0) * buildingBonusMultiplier(province, key);
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
      const incomePerMinute = computeIncomePerMinute(state, country.id);
      const upkeepPerMinute = computeUpkeepPerMinute(state, country.id);
      const resources: ResourceType[] = [
        "supplies",
        "components",
        "fuel",
        "electronics",
        "rareMaterials",
        "manpower",
        "money",
      ];
      for (const key of resources) {
        const netPerMinute = (incomePerMinute[key] ?? 0) - (upkeepPerMinute[key] ?? 0);
        const delta = netPerMinute * (elapsedMs / MS_PER_MINUTE);
        country.resources[key] = Math.max(0, (country.resources[key] ?? 0) + delta);
      }
    }
  });
}
