import type { GameState } from "../state/GameState";
import type { UnitTypeId } from "../state/UnitTypes";

export type AIAction =
  | { kind: "build"; provinceId: string; unitType: UnitTypeId }
  | { kind: "move"; unitId: string; toProvinceId: string };

export interface AIStrategy {
  /** Pure decision function: given the current state, what would this AI-controlled country do right now? */
  decide(state: GameState, countryId: string): AIAction[];
}
