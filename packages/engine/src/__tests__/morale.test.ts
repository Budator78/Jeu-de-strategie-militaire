import { describe, expect, it } from "vitest";
import { createGameState } from "../state/createGameState";
import { advanceTime } from "../turn/advanceTime";
import { boostMoraleWithGold } from "../turn/moraleResolver";
import { provinceYieldMultiplier } from "../turn/economyResolver";
import { issueBuildOrder, issueMoveOrder } from "../turn/orders";
import { UNIT_TYPES } from "../state/UnitTypes";
import {
  CAPTURED_MORALE,
  MORALE_BOOST_AMOUNT,
  MORALE_BOOST_GOLD_COST,
  OCCUPIED_PRODUCTION_FACTOR,
  UPRISING_MORALE_THRESHOLD,
} from "../rules/balance";

const DAY_MS = 86_400_000;

function scenario() {
  return createGameState({
    provinces: [
      { id: "HOME", name: "Home City", neighbors: ["BORDER"], ownerId: "A", isCity: true, resources: { money: 10 } },
      { id: "BORDER", name: "Border", neighbors: ["HOME", "ENEMY_CITY"], ownerId: "B", resources: { money: 10 } },
      { id: "ENEMY_CITY", name: "Enemy City", neighbors: ["BORDER"], ownerId: "B", isCity: true, resources: { money: 10 } },
    ],
    countries: [
      { id: "A", name: "Country A", isAI: false, capitalProvinceId: "HOME" },
      { id: "B", name: "Country B", isAI: true, capitalProvinceId: "ENEMY_CITY" },
    ],
    rngSeed: 11,
  });
}

function withUnit(state: ReturnType<typeof scenario>, id: string, ownerId: string, provinceId: string, health = 100) {
  return {
    ...state,
    units: {
      ...state.units,
      [id]: { id, type: "infantry" as const, ownerId, provinceId, health, attack: 8, defense: 10 },
    },
  };
}

describe("morale & occupation", () => {
  it("captured provinces drop to CAPTURED_MORALE and count as occupied (reduced yield)", () => {
    let state = withUnit(scenario(), "atk", "A", "HOME");
    state = issueMoveOrder(state, "m1", "A", "atk", "BORDER");
    state = advanceTime(state, UNIT_TYPES.infantry.moveTimeMs + 1);

    const border = state.provinces.BORDER;
    expect(border.ownerId).toBe("A");
    expect(border.homelandOf).toBe("B");
    expect(border.morale).toBeLessThanOrEqual(CAPTURED_MORALE + 1);
    expect(provinceYieldMultiplier(border)).toBeLessThanOrEqual((CAPTURED_MORALE / 100) * OCCUPIED_PRODUCTION_FACTOR + 0.01);
  });

  it("homeland provinces at full morale produce at 100%", () => {
    const state = scenario();
    expect(provinceYieldMultiplier(state.provinces.HOME)).toBe(1);
  });

  it("occupied morale drifts up toward its (low) target over time", () => {
    let state = withUnit(scenario(), "atk", "A", "HOME");
    state = issueMoveOrder(state, "m1", "A", "atk", "BORDER");
    state = advanceTime(state, UNIT_TYPES.infantry.moveTimeMs + 1);
    const moraleAfterCapture = state.provinces.BORDER.morale;

    state = advanceTime(state, DAY_MS / 2); // half a day, garrisoned so no uprising roll matters
    expect(state.provinces.BORDER.morale).toBeGreaterThan(moraleAfterCapture);
  });

  it("an ungarrisoned, low-morale occupied province eventually rises up and returns home", () => {
    let state = withUnit(scenario(), "atk", "A", "HOME");
    state = issueMoveOrder(state, "m1", "A", "atk", "BORDER");
    state = advanceTime(state, UNIT_TYPES.infantry.moveTimeMs + 1);
    expect(state.provinces.BORDER.ownerId).toBe("A");
    // Pull the garrison back home so the province is left unheld.
    state = issueMoveOrder(state, "m2", "A", "atk", "HOME");
    state = advanceTime(state, UNIT_TYPES.infantry.moveTimeMs + 1);

    // Ungarrisoned occupied land never calms down (morale stays at 25, below
    // the threshold), so every tick rolls the uprising dice. With the
    // deterministic RNG this flips back to B within a few simulated days.
    let uprose = false;
    for (let i = 0; i < 1500; i++) {
      state = advanceTime(state, 10 * 60 * 1000); // 10 simulated minutes
      if (state.provinces.BORDER.ownerId === "B") {
        uprose = true;
        break;
      }
    }
    expect(uprose).toBe(true);
    expect(state.events.some((e) => e.kind === "uprising")).toBe(true);
    expect(state.provinces.BORDER.morale).toBeGreaterThanOrEqual(UPRISING_MORALE_THRESHOLD);
  });

  it("blocks mobilization in occupied cities but allows it in homeland cities", () => {
    let state = withUnit(scenario(), "atk", "A", "HOME");
    // Give A the resources to build.
    state = {
      ...state,
      countries: {
        ...state.countries,
        A: {
          ...state.countries.A,
          resources: { ...state.countries.A.resources, manpower: 1000, supplies: 1000 },
        },
      },
    };
    // Capture the enemy city (kill its garrisonless path: BORDER then ENEMY_CITY).
    state = issueMoveOrder(state, "m1", "A", "atk", "BORDER");
    state = advanceTime(state, UNIT_TYPES.infantry.moveTimeMs + 1);
    state = issueMoveOrder(state, "m2", "A", "atk", "ENEMY_CITY");
    state = advanceTime(state, UNIT_TYPES.infantry.moveTimeMs + 1);
    expect(state.provinces.ENEMY_CITY.ownerId).toBe("A");

    const refused = issueBuildOrder(state, "b1", "A", "ENEMY_CITY", "infantry");
    expect(refused).toBe(state); // occupied city: no mobilization

    const accepted = issueBuildOrder(state, "b2", "A", "HOME", "infantry");
    expect(accepted).not.toBe(state); // homeland city: fine
  });

  it("heals units garrisoned in a friendly city over time", () => {
    let state = withUnit(scenario(), "wounded", "A", "HOME", 50);
    state = advanceTime(state, DAY_MS);
    expect(state.units.wounded.health).toBeGreaterThan(55);
    expect(state.units.wounded.health).toBeLessThanOrEqual(100);
  });

  it("boostMoraleWithGold charges gold and raises morale, refusing when broke", () => {
    let state = scenario();
    state = {
      ...state,
      provinces: { ...state.provinces, HOME: { ...state.provinces.HOME, morale: 60 } },
      countries: { ...state.countries, A: { ...state.countries.A, gold: MORALE_BOOST_GOLD_COST } },
    };
    state = boostMoraleWithGold(state, "A", "HOME");
    expect(state.provinces.HOME.morale).toBe(60 + MORALE_BOOST_AMOUNT);
    expect(state.countries.A.gold).toBe(0);

    const refused = boostMoraleWithGold(state, "A", "HOME");
    expect(refused).toBe(state);
  });
});
