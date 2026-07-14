import type { GameState } from "../state/GameState";
import { checkWinConditions } from "../rules/winConditions";
import { resolveEconomy } from "./economyResolver";
import { applyGoldConfig } from "./goldResolver";
import { processCompletedOrders } from "./ordersResolver";

/**
 * Advances the simulation by elapsedMs of game time. The source game runs
 * continuously in real time rather than in discrete turns, so this is called
 * repeatedly from a game loop (see apps/web/src/hooks/useGameLoop.ts) instead
 * of from a manual "end turn" action: the economy ticks, the clock advances,
 * any build/move orders whose time has come are applied (including combat),
 * the gold config is enforced, and win conditions are checked. Once the game
 * has ended, further calls are no-ops.
 */
export function advanceTime(state: GameState, elapsedMs: number): GameState {
  if (state.status === "ended") return state;

  const afterEconomy = resolveEconomy(state, elapsedMs);
  const withNewClock = { ...afterEconomy, clockMs: afterEconomy.clockMs + elapsedMs };
  const afterOrders = processCompletedOrders(withNewClock);
  const afterGold = applyGoldConfig(afterOrders);

  const winCheck = checkWinConditions(afterGold);
  if (winCheck.status === "ended") {
    return { ...afterGold, status: "ended", winnerId: winCheck.winnerId };
  }
  return afterGold;
}
