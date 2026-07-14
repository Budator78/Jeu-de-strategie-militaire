import { produce } from "immer";
import type { GameState } from "../state/GameState";
import type { Province } from "../state/Province";
import { RESEARCH_TYPES } from "../state/ResearchTypes";
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
      } else if (order.kind === "construct") {
        applyConstructOrder(draft, order);
      } else if (order.kind === "research") {
        applyResearchOrder(draft, order);
      } else {
        applyMoveOrder(draft, order);
      }
    }
  });
}

function applyBuildOrder(draft: GameState, order: Extract<Order, { kind: "build" }>): void {
  const province = draft.provinces[order.provinceId];
  if (!province || province.ownerId !== order.ownerId) return; // province lost while building

  const baseDef = UNIT_TYPES[order.unitType];
  const research = Object.values(RESEARCH_TYPES).find((r) => r.unitType === order.unitType);
  const researched = research ? draft.countries[order.ownerId]?.researchedIds.includes(research.id) : false;

  const unitId = `unit:${order.id}`;
  draft.units[unitId] = {
    id: unitId,
    type: order.unitType,
    ownerId: order.ownerId,
    provinceId: order.provinceId,
    health: 100,
    attack: baseDef.attack * (1 + (researched && research ? research.attackBonus : 0)),
    defense: baseDef.defense * (1 + (researched && research ? research.defenseBonus : 0)),
  };
}

function applyConstructOrder(draft: GameState, order: Extract<Order, { kind: "construct" }>): void {
  const province = draft.provinces[order.provinceId];
  if (!province || province.ownerId !== order.ownerId) return; // province lost while building
  if (!province.buildings.includes(order.buildingId)) {
    province.buildings.push(order.buildingId);
  }
}

function applyResearchOrder(draft: GameState, order: Extract<Order, { kind: "research" }>): void {
  const country = draft.countries[order.ownerId];
  if (!country) return;
  if (!country.researchedIds.includes(order.researchId)) {
    country.researchedIds.push(order.researchId);
  }
}

/** Buildings are destroyed on capture, per the source game (see wiki: Arms Industry). */
function captureProvince(province: Province, newOwnerId: string): void {
  province.ownerId = newOwnerId;
  province.buildings = [];
}

/** Attacking (or capturing) another country's territory puts both sides at war — see ai/basicAI.ts. */
function declareWar(draft: GameState, aId: string, bId: string): void {
  const a = draft.countries[aId];
  const b = draft.countries[bId];
  if (a && !a.atWarWith.includes(bId)) a.atWarWith.push(bId);
  if (b && !b.atWarWith.includes(aId)) b.atWarWith.push(aId);
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

  if (destination.ownerId !== null) {
    declareWar(draft, unit.ownerId, destination.ownerId);
  }

  const defenders = Object.values(draft.units).filter(
    (u) => u.provinceId === order.toProvinceId && u.ownerId !== unit.ownerId,
  );

  if (defenders.length === 0) {
    unit.provinceId = order.toProvinceId;
    if (UNIT_TYPES[unit.type].canCapture) {
      captureProvince(destination, unit.ownerId);
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
      captureProvince(destination, unit.ownerId);
    }
  }
  // else: attacker survived but defenders remain — bounced back, stays put.
}
