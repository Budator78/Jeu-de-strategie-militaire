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

/** True when `fromId` has a standing peace offer extended to `toId`. */
export function hasOfferedPeace(state: GameState, fromId: string, toId: string): boolean {
  return state.countries[fromId]?.peaceOffersTo.includes(toId) ?? false;
}

/**
 * Formal war declaration (the diplomacy panel's "guerre" option). War is
 * always mutual: both atWarWith lists and both stances flip to "war", any
 * standing right-of-way between the two is voided, and stale peace offers
 * are cleared.
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
    draft.countries[actorId].peaceOffersTo = draft.countries[actorId].peaceOffersTo.filter((id) => id !== targetId);
    draft.countries[targetId].peaceOffersTo = draft.countries[targetId].peaceOffersTo.filter((id) => id !== actorId);
    draft.events.push({ kind: "warDeclared", atMs: draft.clockMs, attackerId: actorId, defenderId: targetId });
    trimEvents(draft);
  });
}

/**
 * Extends a peace offer to a country you're at war with. Peace requires
 * mutual consent, like right of way: nothing happens until the OTHER side
 * offers too (i.e. accepts) — at that moment the war ends for both, stances
 * and offers are cleared, and the treaty hits the newspaper. Offering twice
 * is a no-op.
 */
export function offerPeace(state: GameState, actorId: string, targetId: string): GameState {
  if (actorId === targetId) return state;
  const actor = state.countries[actorId];
  const target = state.countries[targetId];
  if (!actor || !target) return state;
  if (!areAtWar(state, actorId, targetId)) return state;
  if (hasOfferedPeace(state, actorId, targetId)) return state;

  const reciprocal = hasOfferedPeace(state, targetId, actorId);

  return produce(state, (draft) => {
    if (reciprocal) {
      // The other side already held out its hand — this is an acceptance.
      draft.countries[actorId].atWarWith = draft.countries[actorId].atWarWith.filter((id) => id !== targetId);
      draft.countries[targetId].atWarWith = draft.countries[targetId].atWarWith.filter((id) => id !== actorId);
      delete draft.countries[actorId].stances[targetId];
      delete draft.countries[targetId].stances[actorId];
      draft.countries[actorId].peaceOffersTo = draft.countries[actorId].peaceOffersTo.filter((id) => id !== targetId);
      draft.countries[targetId].peaceOffersTo = draft.countries[targetId].peaceOffersTo.filter((id) => id !== actorId);
      draft.events.push({ kind: "peaceMade", atMs: draft.clockMs, aId: actorId, bId: targetId });
    } else {
      draft.countries[actorId].peaceOffersTo.push(targetId);
      draft.events.push({ kind: "peaceOffered", atMs: draft.clockMs, fromId: actorId, toId: targetId });
    }
    trimEvents(draft);
  });
}

/** Withdraws a standing peace offer that hasn't been accepted yet. */
export function retractPeaceOffer(state: GameState, actorId: string, targetId: string): GameState {
  if (!hasOfferedPeace(state, actorId, targetId)) return state;
  return produce(state, (draft) => {
    draft.countries[actorId].peaceOffersTo = draft.countries[actorId].peaceOffersTo.filter((id) => id !== targetId);
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
