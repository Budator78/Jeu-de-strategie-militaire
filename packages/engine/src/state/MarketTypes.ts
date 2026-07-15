import type { ResourceType } from "./ResourceTypes";

/**
 * A standing offer on the system market. `playerBuys` offers sell resources
 * TO the trading country (paid in money or gold); `playerSells` offers buy
 * resources FROM it (always paid out in money). In the source game these are
 * player-posted orders; in this solo sandbox a system ladder provides
 * liquidity at fixed price tiers and replenishes when drained.
 */
export interface MarketOffer {
  id: string;
  resource: Exclude<ResourceType, "money">;
  direction: "playerBuys" | "playerSells";
  /** Units remaining on the offer. */
  amount: number;
  /** Default size the offer replenishes to once fully consumed. */
  baseAmount: number;
  pricePerUnit: number;
  currency: "money" | "gold";
}

const TRADEABLE: Exclude<ResourceType, "money">[] = [
  "supplies",
  "components",
  "fuel",
  "electronics",
  "rareMaterials",
  "manpower",
];

/** Price ladder shaped after the reference market: one gold tier, then increasingly expensive money tiers. */
export function createDefaultMarketOffers(): MarketOffer[] {
  const offers: MarketOffer[] = [];
  TRADEABLE.forEach((resource, i) => {
    const sizeFactor = 1 + (i % 3) * 0.15;
    const buyTiers: Array<{ amount: number; price: number; currency: "money" | "gold" }> = [
      { amount: Math.round(4000 * sizeFactor), price: 0.625, currency: "gold" },
      { amount: Math.round(900 * sizeFactor), price: 6.7, currency: "money" },
      { amount: Math.round(930 * sizeFactor), price: 8.4, currency: "money" },
      { amount: Math.round(815 * sizeFactor), price: 8.7, currency: "money" },
    ];
    const sellTiers: Array<{ amount: number; price: number }> = [
      { amount: Math.round(4500 * sizeFactor), price: 5 },
      { amount: Math.round(2900 * sizeFactor), price: 4.9 },
    ];
    buyTiers.forEach((tier, t) => {
      offers.push({
        id: `mkt:${resource}:buy:${t}`,
        resource,
        direction: "playerBuys",
        amount: tier.amount,
        baseAmount: tier.amount,
        pricePerUnit: tier.price,
        currency: tier.currency,
      });
    });
    sellTiers.forEach((tier, t) => {
      offers.push({
        id: `mkt:${resource}:sell:${t}`,
        resource,
        direction: "playerSells",
        amount: tier.amount,
        baseAmount: tier.amount,
        pricePerUnit: tier.price,
        currency: "money",
      });
    });
  });
  return offers;
}
