import { describe, expect, it } from "vitest";
import { createGameState } from "../state/createGameState";
import { advanceTime } from "../turn/advanceTime";
import { UNLIMITED_GOLD_FLOOR } from "../rules/balance";

const ONE_MINUTE_MS = 60_000;

function scenario(unlimitedGold: boolean, bIsAI = true) {
  return createGameState({
    provinces: [
      { id: "P1", name: "Province One", neighbors: ["P2"], ownerId: "A", resources: { money: 10 } },
      { id: "P2", name: "Province Two", neighbors: ["P1"], ownerId: "A", resources: { money: 7 } },
      { id: "P3", name: "Province Three", neighbors: [], ownerId: "B", resources: { money: 3 } },
      { id: "P4", name: "Unclaimed", neighbors: [], ownerId: null, resources: { money: 100 } },
    ],
    countries: [
      { id: "A", name: "Country A", isAI: false, capitalProvinceId: "P1" },
      { id: "B", name: "Country B", isAI: bIsAI, capitalProvinceId: "P3" },
    ],
    config: { unlimitedGold },
  });
}

describe("advanceTime / standard resources", () => {
  it("accrues owned-province money proportional to elapsed minutes", () => {
    const state = advanceTime(scenario(false), ONE_MINUTE_MS);
    expect(state.countries.A.resources.money).toBe(17);
    expect(state.countries.B.resources.money).toBe(3);
  });

  it("accrues half as much for half a minute", () => {
    const state = advanceTime(scenario(false), ONE_MINUTE_MS / 2);
    expect(state.countries.A.resources.money).toBe(8.5);
  });

  it("ignores unclaimed provinces", () => {
    const state = advanceTime(scenario(false), ONE_MINUTE_MS);
    expect(state.countries.A.resources.money).not.toBe(117);
    expect(state.countries.B.resources.money).not.toBe(103);
  });

  it("advances the game clock by elapsedMs", () => {
    const state = advanceTime(scenario(false), 12_345);
    expect(state.clockMs).toBe(12_345);
  });
});

describe("advanceTime / unit upkeep", () => {
  it("deducts upkeep for owned units from the matching resource", () => {
    let state = scenario(false);
    state = {
      ...state,
      units: {
        u1: { id: "u1", type: "infantry", ownerId: "A", provinceId: "P1", health: 100, attack: 8, defense: 10 },
      },
    };
    state = advanceTime(state, ONE_MINUTE_MS);
    // Income: 17 money (unaffected, infantry upkeep is supplies+manpower).
    // Supplies/manpower start at 0 and have no province income here, so upkeep just clamps at 0.
    expect(state.countries.A.resources.money).toBe(17);
    expect(state.countries.A.resources.supplies).toBe(0);
    expect(state.countries.A.resources.manpower).toBe(0);
  });

  it("never lets a resource go negative from upkeep", () => {
    let state = scenario(false);
    state = {
      ...state,
      units: Object.fromEntries(
        Array.from({ length: 50 }, (_, i) => [
          `u${i}`,
          { id: `u${i}`, type: "tank" as const, ownerId: "A", provinceId: "P1", health: 100, attack: 16, defense: 12 },
        ]),
      ),
    };
    state = advanceTime(state, ONE_MINUTE_MS);
    expect(state.countries.A.resources.fuel).toBe(0);
    expect(state.countries.A.resources.components).toBe(0);
  });
});

describe("advanceTime / gold (premium currency)", () => {
  it("tops up only human-controlled countries when unlimitedGold is enabled", () => {
    const state = advanceTime(scenario(true), ONE_MINUTE_MS);
    expect(state.countries.A.gold).toBe(UNLIMITED_GOLD_FLOOR);
    expect(state.countries.B.gold).toBe(0);
  });

  it("leaves gold untouched when unlimitedGold is disabled", () => {
    const state = advanceTime(scenario(false), ONE_MINUTE_MS);
    expect(state.countries.A.gold).toBe(0);
    expect(state.countries.B.gold).toBe(0);
  });

  it("still gives a human-controlled country B its own gold if it isn't AI", () => {
    const state = advanceTime(scenario(true, false), ONE_MINUTE_MS);
    expect(state.countries.B.gold).toBe(UNLIMITED_GOLD_FLOOR);
  });
});
