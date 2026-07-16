import type { ResearchId } from "./ResearchTypes";
import type { ResourceType } from "./ResourceTypes";

/**
 * One country's declared posture toward another (sparse map, defaults to
 * "peace"). "rightOfWay" grants the OTHER country peaceful passage through
 * this country's territory — see turn/diplomacy.ts and ordersResolver.ts.
 */
export type DiplomaticStance = "peace" | "war" | "rightOfWay";

export interface Country {
  id: string;
  name: string;
  isAI: boolean;
  /** Stockpiled standard resources, accumulated turn over turn from owned provinces. */
  resources: Record<ResourceType, number>;
  /** Completed research (see turn/orders.ts issueResearchOrder, ResearchTypes.ts). */
  researchedIds: ResearchId[];
  /**
   * Premium currency. Not earned from provinces and not available to AI
   * countries in the real game — see rules/balance.ts and turn/goldResolver.ts.
   */
  gold: number;
  capitalProvinceId: string | null;
  alive: boolean;
  /**
   * Country ids this country has fought (attacked or been attacked by).
   * AI strategies use this to avoid initiating attacks on human players
   * unprovoked — see turn/ordersResolver.ts, ai/basicAI.ts.
   */
  atWarWith: string[];
  /**
   * Declared postures toward specific countries (sparse; anything absent is
   * "peace"). Kept in sync with atWarWith when wars start/end — see
   * turn/diplomacy.ts.
   */
  stances: Record<string, DiplomaticStance>;
  /**
   * Standing peace offers this country has extended. A war only ends when
   * BOTH sides have offered (i.e. the other side accepts) — see
   * turn/diplomacy.ts offerPeace.
   */
  peaceOffersTo: string[];
}
