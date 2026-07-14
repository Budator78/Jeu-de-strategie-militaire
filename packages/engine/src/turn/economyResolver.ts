import { produce } from "immer";
import type { GameState } from "../state/GameState";
import type { ResourceType } from "../state/ResourceTypes";

const MS_PER_MINUTE = 60_000;

function computeIncomePerMinute(
  state: GameState,
  countryId: string,
): Partial<Record<ResourceType, number>> {
  const income: Partial<Record<ResourceType, number>> = {};
  for (const province of Object.values(state.provinces)) {
    if (province.ownerId !== countryId) continue;
    for (const [resource, amount] of Object.entries(province.resources)) {
      const key = resource as ResourceType;
      income[key] = (income[key] ?? 0) + (amount ?? 0);
    }
  }
  return income;
}

/**
 * Adds each country's province income (supplies, components, fuel,
 * electronics, rare materials, manpower, money — all expressed as per-minute
 * rates on Province.resources) to its stockpile, proportional to elapsedMs.
 * Gold is handled separately in goldResolver.ts — it isn't produced by provinces.
 */
export function resolveEconomy(state: GameState, elapsedMs: number): GameState {
  if (elapsedMs <= 0) return state;
  return produce(state, (draft) => {
    for (const country of Object.values(draft.countries)) {
      if (!country.alive) continue;
      const incomePerMinute = computeIncomePerMinute(state, country.id);
      for (const [resource, ratePerMinute] of Object.entries(incomePerMinute)) {
        const key = resource as ResourceType;
        const amount = (ratePerMinute ?? 0) * (elapsedMs / MS_PER_MINUTE);
        country.resources[key] = (country.resources[key] ?? 0) + amount;
      }
    }
  });
}
