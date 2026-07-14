import { describe, expect, it } from "vitest";
import { createGameState } from "../state/createGameState";
import { issueBuildOrder, issueMoveOrder } from "../turn/orders";
import { advanceTime } from "../turn/advanceTime";
import { UNIT_TYPES } from "../state/UnitTypes";
import { basicAI } from "../ai/basicAI";

function scenario() {
  return createGameState({
    provinces: [
      {
        id: "CITY_B",
        name: "City B",
        neighbors: ["FIELD_WEAK", "FIELD_STRONG"],
        ownerId: "B",
        isCity: true,
        resources: { money: 5 },
      },
      { id: "FIELD_WEAK", name: "Weak field", neighbors: ["CITY_B"], ownerId: null, resources: { money: 5 } },
      { id: "FIELD_STRONG", name: "Strong field", neighbors: ["CITY_B"], ownerId: "A", resources: { money: 5 } },
    ],
    countries: [
      { id: "A", name: "Country A", isAI: false, capitalProvinceId: null },
      { id: "B", name: "Country B", isAI: true, capitalProvinceId: "CITY_B" },
    ],
    rngSeed: 7,
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
          supplies: 1000,
          components: 1000,
          fuel: 1000,
          electronics: 1000,
          rareMaterials: 1000,
          manpower: 1000,
          money: 1000,
        },
      },
    },
  };
}

describe("basicAI", () => {
  it("does nothing for a country with no resources, cities, or units", () => {
    const state = scenario();
    expect(basicAI.decide(state, "B")).toEqual([]);
  });

  it("queues a build in an idle, affordable city", () => {
    const state = withResources(scenario(), "B");
    const actions = basicAI.decide(state, "B");
    expect(actions).toContainEqual({ kind: "build", provinceId: "CITY_B", unitType: "infantry" });
  });

  it("does not double-queue a build in a city with a pending order", () => {
    let state = withResources(scenario(), "B");
    state = issueBuildOrder(state, "order-1", "B", "CITY_B", "infantry");
    const actions = basicAI.decide(state, "B");
    expect(actions.some((a) => a.kind === "build")).toBe(false);
  });

  it("sends an idle unit toward the weakest (undefended) adjacent province", () => {
    let state = withResources(scenario(), "B");
    state = issueBuildOrder(state, "order-1", "B", "CITY_B", "infantry");
    state = advanceTime(state, UNIT_TYPES.infantry.buildTimeMs + 1);
    const unitId = Object.keys(state.units)[0];

    // Station a defender on the "strong" field so the AI should prefer the weak, empty one.
    state = withResources(state, "A");
    state = issueBuildOrder(state, "order-a", "A", "FIELD_STRONG", "infantry");
    // FIELD_STRONG isn't a city in this scenario, so building there should be rejected —
    // simulate a defender by placing a unit directly instead.
    state = { ...state, units: { ...state.units, "defender-1": { id: "defender-1", type: "tank", ownerId: "A", provinceId: "FIELD_STRONG", health: 100 } } };

    const actions = basicAI.decide(state, "B");
    const moveAction = actions.find((a) => a.kind === "move" && a.unitId === unitId);
    expect(moveAction).toEqual({ kind: "move", unitId, toProvinceId: "FIELD_WEAK" });
  });

  it("does not re-issue a move for a unit that already has a pending move order", () => {
    let state = withResources(scenario(), "B");
    state = issueBuildOrder(state, "order-1", "B", "CITY_B", "infantry");
    state = advanceTime(state, UNIT_TYPES.infantry.buildTimeMs + 1);
    const unitId = Object.keys(state.units)[0];
    state = issueMoveOrder(state, "order-2", "B", unitId, "FIELD_WEAK");

    const actions = basicAI.decide(state, "B");
    expect(actions.some((a) => a.kind === "move" && a.unitId === unitId)).toBe(false);
  });
});
