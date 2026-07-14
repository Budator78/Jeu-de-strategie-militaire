import { describe, expect, it } from "vitest";
import { createGameState } from "../state/createGameState";
import { advanceTime } from "../turn/advanceTime";
import { issueBuildOrder, issueResearchOrder } from "../turn/orders";
import { RESEARCH_TYPES } from "../state/ResearchTypes";
import { UNIT_TYPES } from "../state/UnitTypes";

function scenario() {
  return createGameState({
    provinces: [
      { id: "CITY_A", name: "City A", neighbors: [], ownerId: "A", isCity: true, resources: { money: 5 } },
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

describe("issueResearchOrder", () => {
  it("deducts cost immediately and queues research", () => {
    let state = withResources(scenario(), "A");
    state = issueResearchOrder(state, "r-1", "A", "infantryTier2");
    const cost = RESEARCH_TYPES.infantryTier2.cost;
    expect(state.countries.A.resources.money).toBe(10_000 - (cost.money ?? 0));
    expect(state.pendingOrders).toHaveLength(1);
  });

  it("refuses to double-queue the same research", () => {
    let state = withResources(scenario(), "A");
    state = issueResearchOrder(state, "r-1", "A", "infantryTier2");
    const result = issueResearchOrder(state, "r-2", "A", "infantryTier2");
    expect(result).toBe(state);
  });

  it("caps concurrent research at 2 (per the wiki)", () => {
    let state = withResources(scenario(), "A");
    state = issueResearchOrder(state, "r-1", "A", "infantryTier2");
    state = issueResearchOrder(state, "r-2", "A", "tankTier2");
    const result = issueResearchOrder(state, "r-3", "A", "fighterTier2");
    expect(result).toBe(state);
    expect(state.pendingOrders).toHaveLength(2);
  });

  it("refuses to re-research an already-completed tech", () => {
    let state = withResources(scenario(), "A");
    state = issueResearchOrder(state, "r-1", "A", "infantryTier2");
    state = advanceTime(state, RESEARCH_TYPES.infantryTier2.researchTimeMs + 1);
    expect(state.countries.A.researchedIds).toContain("infantryTier2");

    const result = issueResearchOrder(state, "r-2", "A", "infantryTier2");
    expect(result).toBe(state);
  });
});

describe("research bonus applied at build time", () => {
  it("boosts a newly built unit's attack/defense once researched", () => {
    let state = withResources(scenario(), "A");
    state = issueResearchOrder(state, "r-1", "A", "infantryTier2");
    state = advanceTime(state, RESEARCH_TYPES.infantryTier2.researchTimeMs + 1);

    state = issueBuildOrder(state, "b-1", "A", "CITY_A", "infantry");
    state = advanceTime(state, UNIT_TYPES.infantry.buildTimeMs + 1);

    const unit = Object.values(state.units)[0];
    const bonus = RESEARCH_TYPES.infantryTier2.attackBonus;
    expect(unit.attack).toBeCloseTo(UNIT_TYPES.infantry.attack * (1 + bonus), 5);
    expect(unit.defense).toBeCloseTo(UNIT_TYPES.infantry.defense * (1 + RESEARCH_TYPES.infantryTier2.defenseBonus), 5);
  });

  it("does not boost units built before research completes", () => {
    let state = withResources(scenario(), "A");
    state = issueBuildOrder(state, "b-1", "A", "CITY_A", "infantry");
    state = advanceTime(state, UNIT_TYPES.infantry.buildTimeMs + 1);

    const unit = Object.values(state.units)[0];
    expect(unit.attack).toBe(UNIT_TYPES.infantry.attack);
    expect(unit.defense).toBe(UNIT_TYPES.infantry.defense);
  });

  it("does not affect other unit types", () => {
    let state = withResources(scenario(), "A");
    state = issueResearchOrder(state, "r-1", "A", "infantryTier2");
    state = advanceTime(state, RESEARCH_TYPES.infantryTier2.researchTimeMs + 1);

    state = issueBuildOrder(state, "b-1", "A", "CITY_A", "tank");
    state = advanceTime(state, UNIT_TYPES.tank.buildTimeMs + 1);

    const unit = Object.values(state.units)[0];
    expect(unit.attack).toBe(UNIT_TYPES.tank.attack);
    expect(unit.defense).toBe(UNIT_TYPES.tank.defense);
  });
});
