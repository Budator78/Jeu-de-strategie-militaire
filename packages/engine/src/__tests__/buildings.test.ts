import { describe, expect, it } from "vitest";
import { createGameState } from "../state/createGameState";
import { advanceTime } from "../turn/advanceTime";
import { issueConstructOrder, issueMoveOrder } from "../turn/orders";
import { BUILDING_TYPES } from "../state/BuildingTypes";
import { UNIT_TYPES } from "../state/UnitTypes";

function scenario() {
  return createGameState({
    provinces: [
      {
        id: "CITY_A",
        name: "City A",
        neighbors: ["FIELD"],
        ownerId: "A",
        isCity: true,
        resources: { money: 20 },
      },
      { id: "FIELD", name: "Field", neighbors: ["CITY_A"], ownerId: null, resources: { money: 5 } },
    ],
    countries: [{ id: "A", name: "Country A", isAI: false, capitalProvinceId: "CITY_A" }],
    rngSeed: 1,
  });
}

function withResources(state: ReturnType<typeof scenario>, countryId: string) {
  return {
    ...state,
    countries: {
      ...state.countries,
      [countryId]: {
        ...state.countries[countryId],
        resources: {
          supplies: 10_000,
          components: 10_000,
          fuel: 10_000,
          electronics: 10_000,
          rareMaterials: 10_000,
          manpower: 10_000,
          money: 10_000,
        },
      },
    },
  };
}

describe("issueConstructOrder", () => {
  it("deducts cost immediately and queues construction", () => {
    let state = withResources(scenario(), "A");
    state = issueConstructOrder(state, "c-1", "A", "CITY_A", "recruitingOffice");
    const cost = BUILDING_TYPES.recruitingOffice.cost;
    expect(state.countries.A.resources.money).toBe(10_000 - (cost.money ?? 0));
    expect(state.pendingOrders).toHaveLength(1);
  });

  it("refuses to build in a non-owned or non-city province", () => {
    const state = withResources(scenario(), "A");
    const result = issueConstructOrder(state, "c-1", "A", "FIELD", "recruitingOffice");
    expect(result).toBe(state);
  });

  it("refuses to double-queue the same building", () => {
    let state = withResources(scenario(), "A");
    state = issueConstructOrder(state, "c-1", "A", "CITY_A", "recruitingOffice");
    const result = issueConstructOrder(state, "c-2", "A", "CITY_A", "recruitingOffice");
    expect(result).toBe(state);
  });

  it("refuses to rebuild an already-completed building", () => {
    let state = withResources(scenario(), "A");
    state = issueConstructOrder(state, "c-1", "A", "CITY_A", "recruitingOffice");
    state = advanceTime(state, BUILDING_TYPES.recruitingOffice.buildTimeMs + 1);
    expect(state.provinces.CITY_A.buildings).toContain("recruitingOffice");

    const result = issueConstructOrder(state, "c-2", "A", "CITY_A", "recruitingOffice");
    expect(result).toBe(state);
  });

  it("appears in province.buildings once buildTimeMs has elapsed", () => {
    let state = withResources(scenario(), "A");
    state = issueConstructOrder(state, "c-1", "A", "CITY_A", "recruitingOffice");
    state = advanceTime(state, BUILDING_TYPES.recruitingOffice.buildTimeMs - 1);
    expect(state.provinces.CITY_A.buildings).toEqual([]);
    state = advanceTime(state, 2);
    expect(state.provinces.CITY_A.buildings).toEqual(["recruitingOffice"]);
  });
});

describe("building resource bonus", () => {
  it("boosts manpower income once a Recruiting Office is built", () => {
    let state = withResources(scenario(), "A");
    // Give City A a manpower yield so the +25% bonus is observable.
    state = {
      ...state,
      provinces: {
        ...state.provinces,
        CITY_A: { ...state.provinces.CITY_A, resources: { money: 20, manpower: 100 } },
      },
    };
    state = issueConstructOrder(state, "c-1", "A", "CITY_A", "recruitingOffice");
    // Complete construction first (income during this phase is unboosted —
    // a separate concern), then measure income over one full minute with
    // the building already in place, isolating just the bonus effect.
    state = advanceTime(state, BUILDING_TYPES.recruitingOffice.buildTimeMs + 1);
    expect(state.provinces.CITY_A.buildings).toContain("recruitingOffice");
    const manpowerAfterConstruction = state.countries.A.resources.manpower;

    state = advanceTime(state, 60_000);

    // 1 minute of income at 100/min manpower * 1.25 bonus = 125.
    expect(state.countries.A.resources.manpower - manpowerAfterConstruction).toBeCloseTo(125, 0);
  });
});

describe("capture clears buildings", () => {
  it("removes all buildings from a province when it's captured", () => {
    let state = withResources(scenario(), "A");
    state = {
      ...state,
      countries: {
        ...state.countries,
        B: { ...state.countries.A, id: "B", name: "Country B", capitalProvinceId: null },
      },
    };
    state = issueConstructOrder(state, "c-1", "A", "CITY_A", "recruitingOffice");
    state = advanceTime(state, BUILDING_TYPES.recruitingOffice.buildTimeMs + 1);
    expect(state.provinces.CITY_A.buildings).toEqual(["recruitingOffice"]);

    // B builds an infantry (in a hypothetical city) and marches it in to capture CITY_A directly by placing it adjacent.
    state = {
      ...state,
      provinces: { ...state.provinces, FIELD: { ...state.provinces.FIELD, ownerId: "B" } },
      units: {
        ...state.units,
        "b-unit": { id: "b-unit", type: "infantry", ownerId: "B", provinceId: "FIELD", health: 100, attack: 8, defense: 10 },
      },
    };
    state = issueMoveOrder(state, "m-1", "B", "b-unit", "CITY_A");
    state = advanceTime(state, UNIT_TYPES.infantry.moveTimeMs + 1);

    expect(state.provinces.CITY_A.ownerId).toBe("B");
    expect(state.provinces.CITY_A.buildings).toEqual([]);
  });
});
