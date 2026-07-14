import type { GameState } from "../state/GameState";

export function computeVictoryPoints(state: GameState, countryId: string): number {
  let total = 0;
  for (const province of Object.values(state.provinces)) {
    if (province.ownerId === countryId) total += province.victoryPoints;
  }
  return total;
}

export interface WinCheckResult {
  status: "inProgress" | "ended";
  winnerId: string | null;
}

/**
 * Simplified from the source game's "VP above threshold when the campaign
 * countdown hits zero" mechanic (see wiki Victory page): here, whichever
 * country first crosses config.victoryPointTarget wins immediately — more
 * responsive for a single-player sandbox with no fixed match length. Also
 * checks capital-elimination: a country that no longer owns its capital
 * province is defeated; if only one country is left standing, it wins by
 * conquest even below the VP target.
 */
export function checkWinConditions(state: GameState): WinCheckResult {
  const countries = Object.values(state.countries).filter((c) => c.alive);

  for (const country of countries) {
    if (computeVictoryPoints(state, country.id) >= state.config.victoryPointTarget) {
      return { status: "ended", winnerId: country.id };
    }
  }

  const standing = countries.filter((c) => {
    if (!c.capitalProvinceId) return true; // no capital to lose, can't be eliminated this way
    return state.provinces[c.capitalProvinceId]?.ownerId === c.id;
  });

  if (countries.length > 1 && standing.length <= 1) {
    return { status: "ended", winnerId: standing[0]?.id ?? null };
  }

  return { status: "inProgress", winnerId: null };
}
