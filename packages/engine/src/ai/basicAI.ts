import { BUILDING_TYPES, canPlaceBuilding, type BuildingId } from "../state/BuildingTypes";
import type { Country } from "../state/Country";
import type { GameState } from "../state/GameState";
import type { Province } from "../state/Province";
import { MAX_CONCURRENT_RESEARCH, RESEARCH_TYPES, type ResearchId } from "../state/ResearchTypes";
import type { ResourceType } from "../state/ResourceTypes";
import { UNIT_TYPES, type UnitTypeId } from "../state/UnitTypes";
import { computeVisibleProvinces } from "../state/visibility";
import type { AIAction, AIStrategy } from "./types";

/** Infantry first (only infantry can capture territory), then armor, then air. */
const BUILD_PREFERENCE: UnitTypeId[] = ["infantry", "tank", "fighter"];
/**
 * Construction priorities: annex freshly occupied cities (25%→50%), harden
 * homeland cities, then boost production. Placement is checked per province.
 */
const CONSTRUCT_PREFERENCE: BuildingId[] = [
  "annexCity",
  "armyBase",
  "armsIndustry",
  "recruitingOffice",
];
const RESEARCH_PREFERENCE: ResearchId[] = ["infantryTier2", "tankTier2", "fighterTier2"];
/** "Stays defensive, doesn't full send": only picks off lightly-held targets, never storms a real garrison. */
const MAX_DEFENDERS_TO_ATTACK = 2;

function canAfford(
  resources: Record<ResourceType, number>,
  cost: Partial<Record<ResourceType, number>>,
): boolean {
  return Object.entries(cost).every(([resource, amount]) => resources[resource as ResourceType] >= (amount ?? 0));
}

function hasPendingBuild(state: GameState, provinceId: string): boolean {
  return state.pendingOrders.some((o) => o.kind === "build" && o.provinceId === provinceId);
}

function hasPendingConstruction(state: GameState, provinceId: string): boolean {
  return state.pendingOrders.some((o) => o.kind === "construct" && o.provinceId === provinceId);
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
 * Never initiates an attack on a human-controlled country unprovoked — only
 * reacts once at war (i.e. once that human has attacked first). Free to
 * expand into neutral land or skirmish with other AI countries.
 */
function isAttackable(state: GameState, country: Country, target: Province): boolean {
  if (target.ownerId === null) return true;
  const owner = state.countries[target.ownerId];
  if (!owner) return true;
  if (!owner.isAI && !country.atWarWith.includes(target.ownerId)) return false;
  return true;
}

/**
 * A simple, deterministic AI: build the highest-preference affordable unit
 * and construct the highest-preference affordable building in each idle
 * city, research when it has spare capacity (max 2 concurrent, per the
 * wiki), and send idle units to attack/annex the weakest-looking adjacent
 * non-owned province — but only ever lightly-defended ones (never a human
 * unprovoked, never a real garrison) so it stays defensive rather than
 * "full sending" every idle unit at the nearest target.
 */
export const basicAI: AIStrategy = {
  decide(state, countryId, options) {
    const actions: AIAction[] = [];
    const country = state.countries[countryId];
    if (!country || !country.alive) return actions;

    // Under fog (the default), the AI only "sees" enemy units inside its own
    // sight range — same rule as the human player. null = admin revealed map.
    const fogEnabled = options?.fogOfWar ?? true;
    const visible = fogEnabled ? computeVisibleProvinces(state.provinces, state.units, countryId) : null;

    for (const province of Object.values(state.provinces)) {
      if (province.ownerId !== countryId || !province.isCity) continue;

      if (!hasPendingBuild(state, province.id)) {
        const unitType = BUILD_PREFERENCE.find((type) => canAfford(country.resources, UNIT_TYPES[type].cost));
        if (unitType) {
          actions.push({ kind: "build", provinceId: province.id, unitType });
        }
      }

      if (!hasPendingConstruction(state, province.id)) {
        const buildingId = CONSTRUCT_PREFERENCE.find(
          (id) =>
            !province.buildings.includes(id) &&
            canPlaceBuilding(province, countryId, id) &&
            canAfford(country.resources, BUILDING_TYPES[id].cost),
        );
        if (buildingId) {
          actions.push({ kind: "construct", provinceId: province.id, buildingId });
        }
      }
    }

    // Sue for peace when an enemy offers it and the war is going badly
    // (fewer units than them) — otherwise fight on. Under fog, the AI can
    // only weigh the enemy units it actually sees.
    for (const enemyId of country.atWarWith) {
      const enemy = state.countries[enemyId];
      if (!enemy?.peaceOffersTo.includes(countryId)) continue;
      const myUnits = Object.values(state.units).filter((u) => u.ownerId === countryId).length;
      const theirUnits = Object.values(state.units).filter(
        (u) => u.ownerId === enemyId && (!visible || visible.has(u.provinceId)),
      ).length;
      if (myUnits < theirUnits) {
        actions.push({ kind: "acceptPeace", targetId: enemyId });
      }
    }

    const pendingResearchCount = state.pendingOrders.filter(
      (o) => o.kind === "research" && o.ownerId === countryId,
    ).length;
    if (pendingResearchCount < MAX_CONCURRENT_RESEARCH) {
      const researchId = RESEARCH_PREFERENCE.find(
        (id) => !country.researchedIds.includes(id) && canAfford(country.resources, RESEARCH_TYPES[id].cost),
      );
      if (researchId) {
        actions.push({ kind: "research", researchId });
      }
    }

    for (const unit of Object.values(state.units)) {
      if (unit.ownerId !== countryId || !isUnitIdle(state, unit.id)) continue;
      const province = state.provinces[unit.provinceId];
      if (!province) continue;

      const targets = province.neighbors
        .map((id) => state.provinces[id])
        .filter((p): p is NonNullable<typeof p> => Boolean(p) && p.ownerId !== countryId)
        .filter((p) => isAttackable(state, country, p))
        .filter((p) => countDefenders(state, p.id, countryId) <= MAX_DEFENDERS_TO_ATTACK)
        .sort((a, b) => countDefenders(state, a.id, countryId) - countDefenders(state, b.id, countryId));

      if (targets.length > 0) {
        actions.push({ kind: "move", unitId: unit.id, toProvinceId: targets[0].id });
      }
    }

    return actions;
  },
};
