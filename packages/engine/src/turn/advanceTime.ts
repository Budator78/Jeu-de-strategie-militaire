import type { GameState } from "../state/GameState";
import { resolveEconomy } from "./economyResolver";
import { applyGoldConfig } from "./goldResolver";
import { processCompletedOrders } from "./ordersResolver";

/**
 * Advances the simulation by elapsedMs of game time. The source game runs
 * continuously in real time rather than in discrete turns, so this is called
 * repeatedly from a game loop (see apps/web/src/hooks/useGameLoop.ts) instead
 * of from a manual "end turn" action: the economy ticks, the clock advances,
 * any build/move orders whose time has come are applied (including combat),
 * and the gold config is enforced.
 */
export function advanceTime(state: GameState, elapsedMs: number): GameState {
  const afterEconomy = resolveEconomy(state, elapsedMs);
  const withNewClock = { ...afterEconomy, clockMs: afterEconomy.clockMs + elapsedMs };
  const afterOrders = processCompletedOrders(withNewClock);
  return applyGoldConfig(afterOrders);
}
