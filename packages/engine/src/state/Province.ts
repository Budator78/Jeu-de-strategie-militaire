import type { ResourceAmounts } from "./ResourceTypes";

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
}
