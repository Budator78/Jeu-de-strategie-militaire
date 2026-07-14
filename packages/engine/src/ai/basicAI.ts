import type { GameState } from "../state/GameState";
import type { ResourceType } from "../state/ResourceTypes";
import { UNIT_TYPES, type UnitTypeId } from "../state/UnitTypes";
import type { AIAction, AIStrategy } from "./types";

/** Infantry first (only infantry can capture territory), then armor, then air. */
const BUILD_PREFERENCE: UnitTypeId[] = ["infantry", "tank", "fighter"];

function canAfford(
  resources: Record<ResourceType, number>,
  cost: Partial<Record<ResourceType, number>>,
): boolean {
  return Object.entries(cost).every(([resource, amount]) => resources[resource as ResourceType] >= (amount ?? 0));
}

function hasPendingBuild(state: GameState, provinceId: string): boolean {
  return state.pendingOrders.some((o) => o.kind === "build" && o.provinceId === provinceId);
}

function isUnitIdle(state: GameState, unitId: string): boolean {
  return !state.pendingOrders.some((o) => o.kind === "move" && o.unitId === unitId);
}

function countDefenders(state: GameState, provinceId: string, notOwnedBy: string): number {
  let count = 0;
  for (const unit of Object.values(state.units)) {
    if (unit.provinceId === provinceId && unit.ownerId !== notOwnedBy) count++;
  }
  return count;
}

/**
 * A simple, deterministic AI: build the highest-preference affordable unit
 * in each idle city, and send idle units to attack/annex the weakest-looking
 * adjacent non-owned province (fewest defenders first).
 */
export const basicAI: AIStrategy = {
  decide(state, countryId) {
    const actions: AIAction[] = [];
    const country = state.countries[countryId];
    if (!country || !country.alive) return actions;

    for (const province of Object.values(state.provinces)) {
      if (province.ownerId !== countryId || !province.isCity) continue;
      if (hasPendingBuild(state, province.id)) continue;
      const unitType = BUILD_PREFERENCE.find((type) => canAfford(country.resources, UNIT_TYPES[type].cost));
      if (unitType) {
        actions.push({ kind: "build", provinceId: province.id, unitType });
      }
    }

    for (const unit of Object.values(state.units)) {
      if (unit.ownerId !== countryId || !isUnitIdle(state, unit.id)) continue;
      const province = state.provinces[unit.provinceId];
      if (!province) continue;

      const targets = province.neighbors
        .map((id) => state.provinces[id])
        .filter((p): p is NonNullable<typeof p> => Boolean(p) && p.ownerId !== countryId)
        .sort((a, b) => countDefenders(state, a.id, countryId) - countDefenders(state, b.id, countryId));

      if (targets.length > 0) {
        actions.push({ kind: "move", unitId: unit.id, toProvinceId: targets[0].id });
      }
    }

    return actions;
  },
};
