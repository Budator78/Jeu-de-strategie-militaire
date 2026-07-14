import type { Country } from "./Country";
import type { Province } from "./Province";
import type { Unit } from "./Unit";
import type { Order } from "../turn/orders";

export interface GameConfig {
  /** When true, gold never drops below UNLIMITED_GOLD_FLOOR (see rules/balance.ts). */
  unlimitedGold: boolean;
}

export interface GameState {
  /** Cumulative simulated milliseconds since game start (the game runs continuously, not in discrete turns). */
  clockMs: number;
  status: "inProgress" | "won" | "lost";
  provinces: Record<string, Province>;
  countries: Record<string, Country>;
  units: Record<string, Unit>;
  /** Build/move orders queued but not yet completed — see turn/ordersResolver.ts. */
  pendingOrders: Order[];
  /** Combat RNG state (see utils/rng.ts) — evolves each time combat is resolved. */
  rngState: number;
  config: GameConfig;
}
