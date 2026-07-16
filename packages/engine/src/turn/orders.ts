import { produce } from "immer";
import type { BuildingId } from "../state/BuildingTypes";
import { BUILDING_TYPES } from "../state/BuildingTypes";
import type { GameState } from "../state/GameState";
import { MAX_CONCURRENT_RESEARCH, RESEARCH_TYPES, type ResearchId } from "../state/ResearchTypes";
import type { ResourceType } from "../state/ResourceTypes";
import type { UnitTypeId } from "../state/UnitTypes";
import { UNIT_TYPES } from "../state/UnitTypes";

export type Order =
  | {
      kind: "build";
      id: string;
      ownerId: string;
      provinceId: string;
      unitType: UnitTypeId;
      completesAt: number;
    }
  | {
      kind: "move";
      id: string;
      ownerId: string;
      unitId: string;
      fromProvinceId: string;
      toProvinceId: string;
      completesAt: number;
      /**
       * Waypoints still ahead after this hop. When the hop completes
       * peacefully (or the destination is cleared), the resolver queues the
       * next hop automatically — see ordersResolver.ts. A combat bounce or
       * the unit's death drops the rest of the path.
       */
      remainingPath?: string[];
    }
  | {
      kind: "construct";
      id: string;
      ownerId: string;
      provinceId: string;
      buildingId: BuildingId;
      completesAt: number;
    }
  | {
      kind: "research";
      id: string;
      ownerId: string;
      researchId: ResearchId;
      completesAt: number;
    };

function canAffordCost(
  resources: Record<ResourceType, number>,
  cost: Partial<Record<ResourceType, number>>,
): boolean {
  return Object.entries(cost).every(([resource, amount]) => resources[resource as ResourceType] >= (amount ?? 0));
}

/**
 * Queues a unit build in a city, paying its cost upfront. Only HOMELAND
 * cities owned by ownerId can mobilize (occupied cities can't, per the wiki),
 * and only if affordable — otherwise the state is returned unchanged.
 * `orderId` is caller-supplied so the engine stays free of non-deterministic
 * id generation.
 */
export function issueBuildOrder(
  state: GameState,
  orderId: string,
  ownerId: string,
  provinceId: string,
  unitType: UnitTypeId,
): GameState {
  const province = state.provinces[provinceId];
  const country = state.countries[ownerId];
  if (!province || !country) return state;
  if (province.ownerId !== ownerId || !province.isCity) return state;
  if (province.homelandOf !== ownerId) return state; // occupied city — no mobilization

  const def = UNIT_TYPES[unitType];
  if (!canAffordCost(country.resources, def.cost)) return state;

  return produce(state, (draft) => {
    const draftCountry = draft.countries[ownerId];
    for (const [resource, amount] of Object.entries(def.cost)) {
      const key = resource as ResourceType;
      draftCountry.resources[key] -= amount ?? 0;
    }
    draft.pendingOrders.push({
      kind: "build",
      id: orderId,
      ownerId,
      provinceId,
      unitType,
      completesAt: draft.clockMs + def.buildTimeMs,
    });
  });
}

/**
 * Queues a move (or attack, if the destination is hostile) into an adjacent
 * province. A unit can only have one pending move order at a time.
 */
export function issueMoveOrder(
  state: GameState,
  orderId: string,
  ownerId: string,
  unitId: string,
  toProvinceId: string,
): GameState {
  const unit = state.units[unitId];
  if (!unit || unit.ownerId !== ownerId) return state;
  const fromProvince = state.provinces[unit.provinceId];
  if (!fromProvince || !fromProvince.neighbors.includes(toProvinceId)) return state;
  const alreadyMoving = state.pendingOrders.some(
    (o) => o.kind === "move" && o.unitId === unitId,
  );
  if (alreadyMoving) return state;

  const def = UNIT_TYPES[unit.type];
  return produce(state, (draft) => {
    draft.pendingOrders.push({
      kind: "move",
      id: orderId,
      ownerId,
      unitId,
      fromProvinceId: unit.provinceId,
      toProvinceId,
      completesAt: draft.clockMs + def.moveTimeMs,
    });
  });
}

/** Drops every pending move order of a unit. Its position never changed mid-hop, so this simply halts it in place. */
export function cancelUnitMoves(state: GameState, ownerId: string, unitId: string): GameState {
  const unit = state.units[unitId];
  if (!unit || unit.ownerId !== ownerId) return state;
  if (!state.pendingOrders.some((o) => o.kind === "move" && o.unitId === unitId)) return state;
  return produce(state, (draft) => {
    draft.pendingOrders = draft.pendingOrders.filter((o) => !(o.kind === "move" && o.unitId === unitId));
  });
}

/**
 * Orders a unit along a multi-province route (each step must be adjacent to
 * the previous). Replaces any pending moves — re-ordering a marching unit
 * redirects it. The resolver walks the route hop by hop; combat or death
 * interrupts it.
 */
export function issueMovePathOrder(
  state: GameState,
  orderId: string,
  ownerId: string,
  unitId: string,
  path: string[],
): GameState {
  const unit = state.units[unitId];
  if (!unit || unit.ownerId !== ownerId || path.length === 0) return state;

  let current = unit.provinceId;
  for (const step of path) {
    const province = state.provinces[current];
    if (!province || !province.neighbors.includes(step)) return state;
    current = step;
  }

  const def = UNIT_TYPES[unit.type];
  return produce(state, (draft) => {
    draft.pendingOrders = draft.pendingOrders.filter((o) => !(o.kind === "move" && o.unitId === unitId));
    draft.pendingOrders.push({
      kind: "move",
      id: orderId,
      ownerId,
      unitId,
      fromProvinceId: unit.provinceId,
      toProvinceId: path[0],
      remainingPath: path.slice(1),
      completesAt: draft.clockMs + def.moveTimeMs,
    });
  });
}

/**
 * Queues a building's construction in a city, paying its cost upfront.
 * Refuses if the building already exists there, one is already under
 * construction there, or it's unaffordable.
 */
export function issueConstructOrder(
  state: GameState,
  orderId: string,
  ownerId: string,
  provinceId: string,
  buildingId: BuildingId,
): GameState {
  const province = state.provinces[provinceId];
  const country = state.countries[ownerId];
  if (!province || !country) return state;
  if (province.ownerId !== ownerId || !province.isCity) return state;
  if (province.buildings.includes(buildingId)) return state;
  const alreadyBuilding = state.pendingOrders.some(
    (o) => o.kind === "construct" && o.provinceId === provinceId && o.buildingId === buildingId,
  );
  if (alreadyBuilding) return state;

  const def = BUILDING_TYPES[buildingId];
  if (!canAffordCost(country.resources, def.cost)) return state;

  return produce(state, (draft) => {
    const draftCountry = draft.countries[ownerId];
    for (const [resource, amount] of Object.entries(def.cost)) {
      const key = resource as ResourceType;
      draftCountry.resources[key] -= amount ?? 0;
    }
    draft.pendingOrders.push({
      kind: "construct",
      id: orderId,
      ownerId,
      provinceId,
      buildingId,
      completesAt: draft.clockMs + def.buildTimeMs,
    });
  });
}

/**
 * Queues a research, paying its cost upfront. Per the wiki: at most two
 * researches may be in progress for a country at once; refuses if already
 * researched, already pending, at the concurrency cap, or unaffordable.
 */
export function issueResearchOrder(
  state: GameState,
  orderId: string,
  ownerId: string,
  researchId: ResearchId,
): GameState {
  const country = state.countries[ownerId];
  if (!country) return state;
  if (country.researchedIds.includes(researchId)) return state;

  const pendingForCountry = state.pendingOrders.filter(
    (o) => o.kind === "research" && o.ownerId === ownerId,
  );
  if (pendingForCountry.some((o) => o.kind === "research" && o.researchId === researchId)) return state;
  if (pendingForCountry.length >= MAX_CONCURRENT_RESEARCH) return state;

  const def = RESEARCH_TYPES[researchId];
  if (!canAffordCost(country.resources, def.cost)) return state;

  return produce(state, (draft) => {
    const draftCountry = draft.countries[ownerId];
    for (const [resource, amount] of Object.entries(def.cost)) {
      const key = resource as ResourceType;
      draftCountry.resources[key] -= amount ?? 0;
    }
    draft.pendingOrders.push({
      kind: "research",
      id: orderId,
      ownerId,
      researchId,
      completesAt: draft.clockMs + def.researchTimeMs,
    });
  });
}
