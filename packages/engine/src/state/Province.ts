import type { ResourceAmounts } from "./ResourceTypes";
import type { BuildingId } from "./BuildingTypes";

export interface Province {
  id: string;
  name: string;
  ownerId: string | null;
  neighbors: string[];
  /**
   * Cities are a special kind of province (per the source game): units can
   * only be mobilized here, and they produce manpower plus usually one
   * specialized resource, on top of money. Plain provinces only produce money.
   */
  isCity: boolean;
  /** Per-minute yield to whichever country owns this province (see turn/economyResolver.ts). */
  resources: ResourceAmounts;
  /** Per the source game: every non-city province is worth 1 VP; a city's VP depends on its population/buildings. */
  victoryPoints: number;
  /** Constructed buildings (city-only per the wiki) — cleared when the province is captured. */
  buildings: BuildingId[];
  /**
   * 0-100. Scales the province's yield (see turn/economyResolver.ts) and,
   * below UPRISING_MORALE_THRESHOLD on occupied land, risks an uprising
   * (see turn/moraleResolver.ts). Drops on capture, drifts toward a target.
   */
  morale: number;
  /**
   * The country this province belonged to at game start. Owner === homelandOf
   * means homeland (full production, can mobilize); anything else is occupied
   * territory (reduced production, no mobilization, uprising risk).
   */
  homelandOf: string | null;
}
