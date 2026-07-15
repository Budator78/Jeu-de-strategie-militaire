import type { Country } from "./Country";
import type { Article, GameEvent } from "./GameEvents";
import type { MarketOffer } from "./MarketTypes";
import type { Province } from "./Province";
import type { Unit } from "./Unit";
import type { Order } from "../turn/orders";

export interface GameConfig {
  /** When true, gold never drops below UNLIMITED_GOLD_FLOOR (see rules/balance.ts). */
  unlimitedGold: boolean;
  /** Total victory points a country needs to win (see rules/winConditions.ts). */
  victoryPointTarget: number;
}

export interface GameState {
  /** Cumulative simulated milliseconds since game start (the game runs continuously, not in discrete turns). */
  clockMs: number;
  status: "inProgress" | "ended";
  /** Set once status is "ended" — the winning country's id, or null if won by no one standing. */
  winnerId: string | null;
  provinces: Record<string, Province>;
  countries: Record<string, Country>;
  units: Record<string, Unit>;
  /** Build/move orders queued but not yet completed — see turn/ordersResolver.ts. */
  pendingOrders: Order[];
  /** Combat RNG state (see utils/rng.ts) — evolves each time combat is resolved. */
  rngState: number;
  /** System market ladder — see state/MarketTypes.ts and turn/market.ts. */
  market: MarketOffer[];
  /** Newspaper feed: wars, captures, losses, trades — see state/GameEvents.ts. */
  events: GameEvent[];
  /** Player-written newspaper articles. */
  articles: Article[];
  config: GameConfig;
}
