import { describe, expect, it } from "vitest";
import { createGameState } from "../state/createGameState";
import { advanceTime } from "../turn/advanceTime";
import { issueBuildOrder, issueMoveOrder } from "../turn/orders";
import { basicAI } from "../ai/basicAI";
import { UNIT_TYPES } from "../state/UnitTypes";

function scenario() {
  return createGameState({
    provinces: [
      {
        id: "CITY_AI",
        name: "City AI",
        neighbors: ["HUMAN_LAND", "NEUTRAL_LAND"],
        ownerId: "AI",
        isCity: true,
        resources: { money: 5 },
      },
      { id: "HUMAN_LAND", name: "Human land", neighbors: ["CITY_AI"], ownerId: "HUMAN", resources: { money: 5 } },
      { id: "NEUTRAL_LAND", name: "Neutral land", neighbors: ["CITY_AI"], ownerId: null, resources: { money: 5 } },
    ],
    countries: [
      { id: "HUMAN", name: "Human Country", isAI: false, capitalProvinceId: "HUMAN_LAND" },
      { id: "AI", name: "AI Country", isAI: true, capitalProvinceId: "CITY_AI" },
    ],
    rngSeed: 3,
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

describe("AI restraint toward human players", () => {
  it("never targets human-owned territory when not at war", () => {
    let state = withResources(scenario(), "AI");
    state = issueBuildOrder(state, "b-1", "AI", "CITY_AI", "infantry");
    state = advanceTime(state, UNIT_TYPES.infantry.buildTimeMs + 1);

    const actions = basicAI.decide(state, "AI");
    const moveAction = actions.find((a) => a.kind === "move");
    expect(moveAction).toEqual({
      kind: "move",
      unitId: Object.keys(state.units)[0],
      toProvinceId: "NEUTRAL_LAND",
    });
  });

  it("targets human territory once the human has attacked first (war declared)", () => {
    // A minimal scenario with no neutral alternative, so the outcome is
    // unambiguous: once at war, HUMAN_LAND must be the (only) chosen target.
    let state = createGameState({
      provinces: [
        { id: "CITY_AI", name: "City AI", neighbors: ["HUMAN_LAND"], ownerId: "AI", isCity: true, resources: { money: 5 } },
        { id: "HUMAN_LAND", name: "Human land", neighbors: ["CITY_AI"], ownerId: "HUMAN", resources: { money: 5 } },
      ],
      countries: [
        { id: "HUMAN", name: "Human Country", isAI: false, capitalProvinceId: null },
        { id: "AI", name: "AI Country", isAI: true, capitalProvinceId: "CITY_AI" },
      ],
      rngSeed: 3,
    });
    state = withResources(state, "AI");
    state = {
      ...state,
      units: {
        aiUnit: { id: "aiUnit", type: "infantry", ownerId: "AI", provinceId: "CITY_AI", health: 100, attack: 8, defense: 10 },
      },
      // Simulate the human having already attacked (war declared) without
      // depending on a specific combat outcome.
      countries: {
        ...state.countries,
        AI: { ...state.countries.AI, atWarWith: ["HUMAN"] },
        HUMAN: { ...state.countries.HUMAN, atWarWith: ["AI"] },
      },
    };

    const actions = basicAI.decide(state, "AI");
    const moveAction = actions.find((a) => a.kind === "move" && a.unitId === "aiUnit");
    expect(moveAction).toEqual({ kind: "move", unitId: "aiUnit", toProvinceId: "HUMAN_LAND" });
  });

  it("only attacks lightly-defended targets, not a real garrison (stays defensive)", () => {
    let state = withResources(scenario(), "AI");
    state = issueBuildOrder(state, "b-1", "AI", "CITY_AI", "infantry");
    state = advanceTime(state, UNIT_TYPES.infantry.buildTimeMs + 1);
    const unitId = Object.keys(state.units)[0];

    // Heavily garrison the neutral land (3 defenders > MAX_DEFENDERS_TO_ATTACK).
    state = {
      ...state,
      provinces: { ...state.provinces, NEUTRAL_LAND: { ...state.provinces.NEUTRAL_LAND, ownerId: "OTHER" } },
      countries: { ...state.countries, OTHER: { ...state.countries.AI, id: "OTHER", name: "Other AI", capitalProvinceId: null } },
      units: {
        ...state.units,
        d1: { id: "d1", type: "tank", ownerId: "OTHER", provinceId: "NEUTRAL_LAND", health: 100, attack: 16, defense: 12 },
        d2: { id: "d2", type: "tank", ownerId: "OTHER", provinceId: "NEUTRAL_LAND", health: 100, attack: 16, defense: 12 },
        d3: { id: "d3", type: "tank", ownerId: "OTHER", provinceId: "NEUTRAL_LAND", health: 100, attack: 16, defense: 12 },
      },
    };

    const actions = basicAI.decide(state, "AI");
    const moveAction = actions.find((a) => a.kind === "move" && a.unitId === unitId);
    expect(moveAction).toBeUndefined();
  });
});
