import { produce } from "immer";
import { MAX_EVENTS } from "../state/GameEvents";
import type { GameState } from "../state/GameState";

function trimEvents(draft: GameState): void {
  if (draft.events.length > MAX_EVENTS) {
    draft.events.splice(0, draft.events.length - MAX_EVENTS);
  }
}

export function areAtWar(state: GameState, aId: string, bId: string): boolean {
  return state.countries[aId]?.atWarWith.includes(bId) ?? false;
}

/**
 * Formal war declaration (the diplomacy panel's "guerre" option). War is
 * always mutual: both atWarWith lists and both stances flip to "war", and
 * any standing right-of-way between the two is voided.
 */
export function declareWarOn(state: GameState, actorId: string, targetId: string): GameState {
  if (actorId === targetId) return state;
  const actor = state.countries[actorId];
  const target = state.countries[targetId];
  if (!actor || !target || areAtWar(state, actorId, targetId)) return state;

  return produce(state, (draft) => {
    draft.countries[actorId].atWarWith.push(targetId);
    draft.countries[targetId].atWarWith.push(actorId);
    draft.countries[actorId].stances[targetId] = "war";
    draft.countries[targetId].stances[actorId] = "war";
    draft.events.push({ kind: "warDeclared", atMs: draft.clockMs, attackerId: actorId, defenderId: targetId });
    trimEvents(draft);
  });
}

/**
 * Ends a war on the spot (sandbox simplification of the source game's
 * ceasefire-offer flow). Both sides return to "peace".
 */
export function makePeace(state: GameState, actorId: string, targetId: string): GameState {
  if (!areAtWar(state, actorId, targetId)) return state;

  return produce(state, (draft) => {
    draft.countries[actorId].atWarWith = draft.countries[actorId].atWarWith.filter((id) => id !== targetId);
    draft.countries[targetId].atWarWith = draft.countries[targetId].atWarWith.filter((id) => id !== actorId);
    delete draft.countries[actorId].stances[targetId];
    delete draft.countries[targetId].stances[actorId];
    draft.events.push({ kind: "peaceMade", atMs: draft.clockMs, aId: actorId, bId: targetId });
    trimEvents(draft);
  });
}

/**
 * Grants (or revokes) the target country peaceful passage through the
 * actor's territory. One-directional, refused while at war.
 */
export function setRightOfWay(state: GameState, actorId: string, targetId: string, granted: boolean): GameState {
  if (actorId === targetId) return state;
  const actor = state.countries[actorId];
  if (!actor || !state.countries[targetId]) return state;
  if (areAtWar(state, actorId, targetId)) return state;
  const currentlyGranted = actor.stances[targetId] === "rightOfWay";
  if (currentlyGranted === granted) return state;

  return produce(state, (draft) => {
    if (granted) {
      draft.countries[actorId].stances[targetId] = "rightOfWay";
    } else {
      delete draft.countries[actorId].stances[targetId];
    }
    draft.events.push({ kind: "rightOfWay", atMs: draft.clockMs, granterId: actorId, toId: targetId, granted });
    trimEvents(draft);
  });
}

/** True when `granterId` currently lets `moverId`'s units cross its land peacefully. */
export function hasRightOfWay(state: GameState, granterId: string, moverId: string): boolean {
  return state.countries[granterId]?.stances[moverId] === "rightOfWay";
}
