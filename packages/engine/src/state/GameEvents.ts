import type { ResourceType } from "./ResourceTypes";
import type { UnitTypeId } from "./UnitTypes";

/**
 * Append-only log of notable happenings, consumed by the in-game newspaper.
 * Capped (see MAX_EVENTS) so a long session doesn't grow the save file forever.
 */
export type GameEvent =
  | { kind: "warDeclared"; atMs: number; attackerId: string; defenderId: string }
  | { kind: "provinceCaptured"; atMs: number; provinceId: string; provinceName: string; fromId: string | null; toId: string }
  | {
      kind: "unitDestroyed";
      atMs: number;
      provinceId: string;
      provinceName: string;
      unitType: UnitTypeId;
      ownerId: string;
      byId: string;
    }
  | {
      kind: "marketTrade";
      atMs: number;
      countryId: string;
      resource: Exclude<ResourceType, "money">;
      amount: number;
      direction: "playerBuys" | "playerSells";
      totalPrice: number;
      currency: "money" | "gold";
    }
  | {
      kind: "uprising";
      atMs: number;
      provinceId: string;
      provinceName: string;
      occupierId: string;
      homelandId: string;
    }
  | { kind: "peaceMade"; atMs: number; aId: string; bId: string }
  | { kind: "rightOfWay"; atMs: number; granterId: string; toId: string; granted: boolean };

export const MAX_EVENTS = 300;

/** Player-written newspaper article (the "Rédiger un article" feature). */
export interface Article {
  id: string;
  atMs: number;
  authorCountryId: string;
  title: string;
  body: string;
}
