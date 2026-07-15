import { describe, expect, it } from "vitest";
import { createGameState } from "../state/createGameState";
import { executeMarketTrade, writeArticle } from "../turn/market";
import { advanceTime } from "../turn/advanceTime";
import { issueMoveOrder } from "../turn/orders";
import { UNIT_TYPES } from "../state/UnitTypes";

function scenario() {
  return createGameState({
    provinces: [
      { id: "P1", name: "Home", neighbors: ["P2"], ownerId: "A", isCity: true, resources: { money: 5 } },
      { id: "P2", name: "Target", neighbors: ["P1"], ownerId: "B", resources: { money: 5 } },
    ],
    countries: [
      { id: "A", name: "Country A", isAI: false, capitalProvinceId: "P1" },
      { id: "B", name: "Country B", isAI: true, capitalProvinceId: "P2" },
    ],
    rngSeed: 5,
  });
}

function withMoney(state: ReturnType<typeof scenario>, countryId: string, money: number, gold = 0) {
  return {
    ...state,
    countries: {
      ...state.countries,
      [countryId]: {
        ...state.countries[countryId],
        gold,
        resources: { ...state.countries[countryId].resources, money },
      },
    },
  };
}

describe("executeMarketTrade", () => {
  it("buys resources for money at the offer price (partial fill by funds)", () => {
    let state = withMoney(scenario(), "A", 670);
    const offer = state.market.find((o) => o.resource === "supplies" && o.direction === "playerBuys" && o.currency === "money")!;
    state = executeMarketTrade(state, "A", offer.id);
    // 670 money at 6.7/unit → exactly 100 units.
    expect(state.countries.A.resources.supplies).toBe(100);
    expect(state.countries.A.resources.money).toBeCloseTo(0, 5);
    expect(state.market.find((o) => o.id === offer.id)!.amount).toBe(offer.amount - 100);
  });

  it("buys with gold when the offer is a gold tier, without touching money", () => {
    let state = withMoney(scenario(), "A", 50, 1000);
    const offer = state.market.find((o) => o.resource === "supplies" && o.currency === "gold")!;
    state = executeMarketTrade(state, "A", offer.id);
    // 1000 gold at 0.625/unit → 1600 units.
    expect(state.countries.A.resources.supplies).toBe(1600);
    expect(state.countries.A.gold).toBeCloseTo(0, 5);
    expect(state.countries.A.resources.money).toBe(50);
  });

  it("sells resources for money and replenishes a drained offer", () => {
    let state = withMoney(scenario(), "A", 0);
    state = {
      ...state,
      countries: {
        ...state.countries,
        A: { ...state.countries.A, resources: { ...state.countries.A.resources, supplies: 99999 } },
      },
    };
    const offer = state.market.find((o) => o.resource === "supplies" && o.direction === "playerSells")!;
    state = executeMarketTrade(state, "A", offer.id);
    // Fill capped by the offer size; offer fully drained → replenished to base.
    expect(state.countries.A.resources.money).toBeCloseTo(offer.amount * offer.pricePerUnit, 5);
    expect(state.countries.A.resources.supplies).toBe(99999 - offer.amount);
    expect(state.market.find((o) => o.id === offer.id)!.amount).toBe(offer.baseAmount);
  });

  it("does nothing when the country can't afford a single unit", () => {
    const state = withMoney(scenario(), "A", 0, 0);
    const offer = state.market.find((o) => o.resource === "supplies" && o.direction === "playerBuys" && o.currency === "money")!;
    const result = executeMarketTrade(state, "A", offer.id);
    expect(result).toBe(state);
  });

  it("logs a marketTrade event", () => {
    let state = withMoney(scenario(), "A", 670);
    const offer = state.market.find((o) => o.resource === "supplies" && o.direction === "playerBuys" && o.currency === "money")!;
    state = executeMarketTrade(state, "A", offer.id);
    const event = state.events.find((e) => e.kind === "marketTrade");
    expect(event).toMatchObject({ kind: "marketTrade", countryId: "A", resource: "supplies", amount: 100 });
  });
});

describe("event log", () => {
  it("records war declarations, captures, and unit losses", () => {
    let state = scenario();
    state = {
      ...state,
      units: {
        atk: { id: "atk", type: "infantry", ownerId: "A", provinceId: "P1", health: 100, attack: 8, defense: 10 },
        def: { id: "def", type: "infantry", ownerId: "B", provinceId: "P2", health: 1, attack: 8, defense: 10 },
      },
    };
    state = issueMoveOrder(state, "m1", "A", "atk", "P2");
    state = advanceTime(state, UNIT_TYPES.infantry.moveTimeMs + 1);

    expect(state.events.some((e) => e.kind === "warDeclared")).toBe(true);
    expect(state.events.some((e) => e.kind === "unitDestroyed")).toBe(true);
    expect(state.events.some((e) => e.kind === "provinceCaptured")).toBe(true);
  });
});

describe("writeArticle", () => {
  it("stores a trimmed article and ignores empty titles", () => {
    let state = scenario();
    state = writeArticle(state, "a1", "A", "  Mon titre  ", "  corps  ");
    expect(state.articles).toHaveLength(1);
    expect(state.articles[0]).toMatchObject({ title: "Mon titre", body: "corps", authorCountryId: "A" });

    const unchanged = writeArticle(state, "a2", "A", "   ", "x");
    expect(unchanged.articles).toHaveLength(1);
  });
});
