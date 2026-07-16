import { produce } from "immer";
import { MAX_EVENTS, type GameEvent } from "../state/GameEvents";
import type { GameState } from "../state/GameState";
import { CAPTURED_MORALE } from "../rules/balance";
import { RESEARCH_TYPES } from "../state/ResearchTypes";
import type { Unit } from "../state/Unit";
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
    if (draft.events.length > MAX_EVENTS) {
      draft.events.splice(0, draft.events.length - MAX_EVENTS);
    }
  });
}

function logEvent(draft: GameState, event: GameEvent): void {
  draft.events.push(event);
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

/** Buildings are destroyed and morale collapses on capture, per the source game. */
function captureProvince(draft: GameState, provinceId: string, newOwnerId: string): void {
  const province = draft.provinces[provinceId];
  if (!province) return;
  logEvent(draft, {
    kind: "provinceCaptured",
    atMs: draft.clockMs,
    provinceId,
    provinceName: province.name,
    fromId: province.ownerId,
    toId: newOwnerId,
  });
  province.ownerId = newOwnerId;
  province.buildings = [];
  province.morale = Math.min(province.morale, CAPTURED_MORALE);
}

/** Attacking (or capturing) another country's territory puts both sides at war — see ai/basicAI.ts. */
function declareWar(draft: GameState, attackerId: string, defenderId: string): void {
  const attacker = draft.countries[attackerId];
  const defender = draft.countries[defenderId];
  const alreadyAtWar = attacker?.atWarWith.includes(defenderId) ?? false;
  if (attacker && !alreadyAtWar) {
    attacker.atWarWith.push(defenderId);
    attacker.stances[defenderId] = "war";
  }
  if (defender && !defender.atWarWith.includes(attackerId)) {
    defender.atWarWith.push(attackerId);
    defender.stances[attackerId] = "war";
  }
  if (!alreadyAtWar) {
    logEvent(draft, { kind: "warDeclared", atMs: draft.clockMs, attackerId, defenderId });
  }
}

function logUnitDestroyed(draft: GameState, unit: Unit, byId: string): void {
  const province = draft.provinces[unit.provinceId];
  logEvent(draft, {
    kind: "unitDestroyed",
    atMs: draft.clockMs,
    provinceId: unit.provinceId,
    provinceName: province?.name ?? unit.provinceId,
    unitType: unit.type,
    ownerId: unit.ownerId,
    byId,
  });
}

/** Once a hop lands, queue the next leg of the route (if any) — see orders.ts issueMovePathOrder. */
function continuePath(draft: GameState, order: Extract<Order, { kind: "move" }>): void {
  const remaining = order.remainingPath;
  if (!remaining || remaining.length === 0) return;
  const unit = draft.units[order.unitId];
  if (!unit || unit.provinceId !== order.toProvinceId) return;

  draft.pendingOrders.push({
    kind: "move",
    id: `${order.id}+`,
    ownerId: order.ownerId,
    unitId: order.unitId,
    fromProvinceId: order.toProvinceId,
    toProvinceId: remaining[0],
    remainingPath: remaining.slice(1),
    completesAt: draft.clockMs + UNIT_TYPES[unit.type].moveTimeMs,
  });
}

function applyMoveOrder(draft: GameState, order: Extract<Order, { kind: "move" }>): void {
  const unit = draft.units[order.unitId];
  if (!unit || unit.provinceId !== order.fromProvinceId) return; // unit gone or already relocated

  const destination = draft.provinces[order.toProvinceId];
  if (!destination) return;

  if (destination.ownerId === unit.ownerId) {
    unit.provinceId = order.toProvinceId;
    continuePath(draft, order);
    return;
  }

  if (destination.ownerId !== null) {
    const owner = draft.countries[destination.ownerId];
    const atWar = owner?.atWarWith.includes(unit.ownerId) ?? false;
    // Right of way: peaceful transit through a granter's land — no war,
    // no combat, no capture (see turn/diplomacy.ts).
    if (!atWar && owner?.stances[unit.ownerId] === "rightOfWay") {
      unit.provinceId = order.toProvinceId;
      continuePath(draft, order);
      return;
    }
    declareWar(draft, unit.ownerId, destination.ownerId);
  }

  const defenders = Object.values(draft.units).filter(
    (u) => u.provinceId === order.toProvinceId && u.ownerId !== unit.ownerId,
  );

  if (defenders.length === 0) {
    unit.provinceId = order.toProvinceId;
    if (UNIT_TYPES[unit.type].canCapture) {
      captureProvince(draft, order.toProvinceId, unit.ownerId);
    }
    continuePath(draft, order);
    return;
  }

  const outcome = resolveCombat(unit, defenders, draft.rngState);
  draft.rngState = outcome.nextRngSeed;

  for (const defender of defenders) {
    const surviving = outcome.defenders.find((d) => d.id === defender.id);
    if (surviving) {
      draft.units[defender.id].health = surviving.health;
    } else {
      logUnitDestroyed(draft, defender, unit.ownerId);
      delete draft.units[defender.id];
    }
  }

  if (!outcome.attackerSurvived) {
    logUnitDestroyed(draft, unit, defenders[0]?.ownerId ?? "?");
    delete draft.units[unit.id];
    return;
  }

  unit.health = outcome.attackerHealth;
  if (outcome.defenders.length === 0) {
    unit.provinceId = order.toProvinceId;
    if (UNIT_TYPES[unit.type].canCapture) {
      captureProvince(draft, order.toProvinceId, unit.ownerId);
    }
    continuePath(draft, order);
    return;
  }

  // Attacker survived but defenders remain: regroup and assault the same
  // province again, keeping the rest of the route — the unit presses on
  // until it breaks through or dies (use Stopper to call it off).
  draft.pendingOrders.push({
    kind: "move",
    id: `${order.id}~`,
    ownerId: order.ownerId,
    unitId: order.unitId,
    fromProvinceId: order.fromProvinceId,
    toProvinceId: order.toProvinceId,
    remainingPath: order.remainingPath,
    completesAt: draft.clockMs + UNIT_TYPES[unit.type].moveTimeMs,
  });
}
