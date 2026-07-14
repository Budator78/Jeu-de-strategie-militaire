import { produce } from "immer";
import type { GameState } from "../state/GameState";
import { UNIT_TYPES } from "../state/UnitTypes";
import { resolveCombat } from "./combatResolver";
import type { Order } from "./orders";

/** Applies every pending order whose completesAt has arrived, in queue order. */
export function processCompletedOrders(state: GameState): GameState {
  const dueOrders = state.pendingOrders.filter((o) => o.completesAt <= state.clockMs);
  if (dueOrders.length === 0) return state;
  const remainingOrders = state.pendingOrders.filter((o) => o.completesAt > state.clockMs);

  return produce({ ...state, pendingOrders: remainingOrders }, (draft) => {
    for (const order of dueOrders) {
      if (order.kind === "build") {
        applyBuildOrder(draft, order);
      } else {
        applyMoveOrder(draft, order);
      }
    }
  });
}

function applyBuildOrder(draft: GameState, order: Extract<Order, { kind: "build" }>): void {
  const province = draft.provinces[order.provinceId];
  if (!province || province.ownerId !== order.ownerId) return; // province lost while building

  const unitId = `unit:${order.id}`;
  draft.units[unitId] = {
    id: unitId,
    type: order.unitType,
    ownerId: order.ownerId,
    provinceId: order.provinceId,
    health: 100,
  };
}

function applyMoveOrder(draft: GameState, order: Extract<Order, { kind: "move" }>): void {
  const unit = draft.units[order.unitId];
  if (!unit || unit.provinceId !== order.fromProvinceId) return; // unit gone or already relocated

  const destination = draft.provinces[order.toProvinceId];
  if (!destination) return;

  if (destination.ownerId === unit.ownerId) {
    unit.provinceId = order.toProvinceId;
    return;
  }

  const defenders = Object.values(draft.units).filter(
    (u) => u.provinceId === order.toProvinceId && u.ownerId !== unit.ownerId,
  );

  if (defenders.length === 0) {
    unit.provinceId = order.toProvinceId;
    if (UNIT_TYPES[unit.type].canCapture) {
      destination.ownerId = unit.ownerId;
    }
    return;
  }

  const outcome = resolveCombat(unit, defenders, draft.rngState);
  draft.rngState = outcome.nextRngSeed;

  for (const defender of defenders) {
    const surviving = outcome.defenders.find((d) => d.id === defender.id);
    if (surviving) {
      draft.units[defender.id].health = surviving.health;
    } else {
      delete draft.units[defender.id];
    }
  }

  if (!outcome.attackerSurvived) {
    delete draft.units[unit.id];
    return;
  }

  unit.health = outcome.attackerHealth;
  if (outcome.defenders.length === 0) {
    unit.provinceId = order.toProvinceId;
    if (UNIT_TYPES[unit.type].canCapture) {
      destination.ownerId = unit.ownerId;
    }
  }
  // else: attacker survived but defenders remain — bounced back, stays put.
}
