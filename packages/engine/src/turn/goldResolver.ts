import { produce } from "immer";
import type { GameState } from "../state/GameState";
import { UNLIMITED_GOLD_FLOOR } from "../rules/balance";

/**
 * Gold is a premium currency in the source game — bought with real money or
 * earned via victory points, never produced by provinces, and never available
 * to AI-controlled countries. When GameConfig.unlimitedGold is on, only
 * human-controlled countries are topped up here.
 */
export function applyGoldConfig(state: GameState): GameState {
  if (!state.config.unlimitedGold) return state;
  return produce(state, (draft) => {
    for (const country of Object.values(draft.countries)) {
      if (country.isAI) continue;
      country.gold = Math.max(country.gold, UNLIMITED_GOLD_FLOOR);
    }
  });
}
