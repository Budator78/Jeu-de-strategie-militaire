import type { ResearchId } from "./ResearchTypes";
import type { ResourceType } from "./ResourceTypes";

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
}
