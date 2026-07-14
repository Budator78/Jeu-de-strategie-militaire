import { produce } from "immer";
import type { GameState } from "../state/GameState";
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
    };

/**
 * Queues a unit build in a city, paying its cost upfront. Only cities owned
 * by ownerId can build (see state/Province.ts), and only if affordable —
 * otherwise the state is returned unchanged. `orderId` is caller-supplied so
 * the engine stays free of non-deterministic id generation.
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

  const def = UNIT_TYPES[unitType];
  for (const [resource, amount] of Object.entries(def.cost)) {
    if (country.resources[resource as ResourceType] < (amount ?? 0)) return state;
  }

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
