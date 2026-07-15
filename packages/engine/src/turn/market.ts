import { produce } from "immer";
import { MAX_EVENTS } from "../state/GameEvents";
import type { GameState } from "../state/GameState";

/**
 * Executes as much of a market offer as the country can afford/supply.
 * `playerBuys` offers: pay money or gold per unit, receive the resource.
 * `playerSells` offers: hand over the resource, receive money.
 * Offers replenish to their base size once fully drained, so the system
 * ladder always provides liquidity. Partial fills are the norm — the fill
 * size is capped by funds (or stock) and by what's left on the offer.
 */
export function executeMarketTrade(state: GameState, countryId: string, offerId: string): GameState {
  const offer = state.market.find((o) => o.id === offerId);
  const country = state.countries[countryId];
  if (!offer || !country || offer.amount <= 0) return state;

  let fill: number;
  if (offer.direction === "playerBuys") {
    const funds = offer.currency === "gold" ? country.gold : country.resources.money;
    fill = Math.min(offer.amount, Math.floor(funds / offer.pricePerUnit));
  } else {
    fill = Math.min(offer.amount, Math.floor(country.resources[offer.resource]));
  }
  if (fill <= 0) return state;

  const totalPrice = fill * offer.pricePerUnit;

  return produce(state, (draft) => {
    const draftCountry = draft.countries[countryId];
    const draftOffer = draft.market.find((o) => o.id === offerId);
    if (!draftCountry || !draftOffer) return;

    if (offer.direction === "playerBuys") {
      if (offer.currency === "gold") {
        draftCountry.gold -= totalPrice;
      } else {
        draftCountry.resources.money -= totalPrice;
      }
      draftCountry.resources[offer.resource] += fill;
    } else {
      draftCountry.resources[offer.resource] -= fill;
      draftCountry.resources.money += totalPrice;
    }

    draftOffer.amount -= fill;
    if (draftOffer.amount <= 0) {
      draftOffer.amount = draftOffer.baseAmount;
    }

    draft.events.push({
      kind: "marketTrade",
      atMs: draft.clockMs,
      countryId,
      resource: offer.resource,
      amount: fill,
      direction: offer.direction,
      totalPrice: Math.round(totalPrice * 100) / 100,
      currency: offer.currency,
    });
    if (draft.events.length > MAX_EVENTS) {
      draft.events.splice(0, draft.events.length - MAX_EVENTS);
    }
  });
}

/** Appends a player-written newspaper article. */
export function writeArticle(
  state: GameState,
  articleId: string,
  authorCountryId: string,
  title: string,
  body: string,
): GameState {
  if (!title.trim()) return state;
  return produce(state, (draft) => {
    draft.articles.push({
      id: articleId,
      atMs: draft.clockMs,
      authorCountryId,
      title: title.trim(),
      body: body.trim(),
    });
  });
}
