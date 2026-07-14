import { describe, expect, it } from "vitest";
import { createGameState } from "../state/createGameState";
import { advanceTime } from "../turn/advanceTime";
import { issueBuildOrder, issueMoveOrder } from "../turn/orders";
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
        resources: { money: 5 },
      },
      {
        id: "FIELD",
        name: "Field",
        neighbors: ["CITY_A", "CITY_B"],
        ownerId: null,
        resources: { money: 5 },
      },
      {
        id: "CITY_B",
        name: "City B",
        neighbors: ["FIELD"],
        ownerId: "B",
        isCity: true,
        resources: { money: 5 },
      },
    ],
    countries: [
      { id: "A", name: "Country A", isAI: false, capitalProvinceId: "CITY_A" },
      { id: "B", name: "Country B", isAI: true, capitalProvinceId: "CITY_B" },
    ],
    rngSeed: 42,
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

describe("issueBuildOrder", () => {
  it("deducts cost immediately and queues the unit", () => {
    let state = withResources(scenario(), "A");
    state = issueBuildOrder(state, "order-1", "A", "CITY_A", "infantry");
    const cost = UNIT_TYPES.infantry.cost;
    expect(state.countries.A.resources.manpower).toBe(1000 - (cost.manpower ?? 0));
    expect(state.countries.A.resources.supplies).toBe(1000 - (cost.supplies ?? 0));
    expect(state.pendingOrders).toHaveLength(1);
  });

  it("refuses to build in a non-owned or non-city province", () => {
    const state = withResources(scenario(), "A");
    const result = issueBuildOrder(state, "order-1", "A", "FIELD", "infantry");
    expect(result).toBe(state);
  });

  it("refuses to build when unaffordable", () => {
    const state = scenario(); // starts with 0 resources
    const result = issueBuildOrder(state, "order-1", "A", "CITY_A", "infantry");
    expect(result).toBe(state);
    expect(result.pendingOrders).toHaveLength(0);
  });

  it("spawns the unit once buildTimeMs has elapsed", () => {
    let state = withResources(scenario(), "A");
    state = issueBuildOrder(state, "order-1", "A", "CITY_A", "infantry");
    state = advanceTime(state, UNIT_TYPES.infantry.buildTimeMs - 1);
    expect(Object.keys(state.units)).toHaveLength(0);
    state = advanceTime(state, 2);
    expect(Object.keys(state.units)).toHaveLength(1);
    const unit = Object.values(state.units)[0];
    expect(unit.type).toBe("infantry");
    expect(unit.ownerId).toBe("A");
    expect(unit.provinceId).toBe("CITY_A");
    expect(state.pendingOrders).toHaveLength(0);
  });
});

describe("issueMoveOrder + capture", () => {
  it("moves an infantry unit into unclaimed territory and captures it", () => {
    let state = withResources(scenario(), "A");
    state = issueBuildOrder(state, "order-1", "A", "CITY_A", "infantry");
    state = advanceTime(state, UNIT_TYPES.infantry.buildTimeMs + 1);
    const unitId = Object.keys(state.units)[0];

    state = issueMoveOrder(state, "order-2", "A", unitId, "FIELD");
    state = advanceTime(state, UNIT_TYPES.infantry.moveTimeMs + 1);

    expect(state.units[unitId].provinceId).toBe("FIELD");
    expect(state.provinces.FIELD.ownerId).toBe("A");
  });

  it("does not capture with a non-capturing unit (tank)", () => {
    let state = withResources(scenario(), "A");
    state = issueBuildOrder(state, "order-1", "A", "CITY_A", "tank");
    state = advanceTime(state, UNIT_TYPES.tank.buildTimeMs + 1);
    const unitId = Object.keys(state.units)[0];

    state = issueMoveOrder(state, "order-2", "A", unitId, "FIELD");
    state = advanceTime(state, UNIT_TYPES.tank.moveTimeMs + 1);

    expect(state.units[unitId].provinceId).toBe("FIELD");
    expect(state.provinces.FIELD.ownerId).toBeNull();
  });

  it("rejects moving to a non-adjacent province", () => {
    let state = withResources(scenario(), "A");
    state = issueBuildOrder(state, "order-1", "A", "CITY_A", "infantry");
    state = advanceTime(state, UNIT_TYPES.infantry.buildTimeMs + 1);
    const unitId = Object.keys(state.units)[0];

    const result = issueMoveOrder(state, "order-2", "A", unitId, "CITY_B");
    expect(result).toBe(state);
  });

  it("resolves combat when attacking a defended enemy province", () => {
    let state = withResources(scenario(), "A");
    state = withResources(state, "B");
    // B fortifies CITY_B with a defending tank.
    state = issueBuildOrder(state, "b-tank", "B", "CITY_B", "tank");
    state = advanceTime(state, UNIT_TYPES.tank.buildTimeMs + 1);

    // A sends a lone infantry to attack the field first, then advances toward B — attack CITY_B directly via FIELD adjacency isn't legal (CITY_A isn't adjacent to CITY_B), so build A's attacker in a province adjacent to CITY_B instead: use FIELD as staging.
    state = issueBuildOrder(state, "a-infantry", "A", "CITY_A", "infantry");
    state = advanceTime(state, UNIT_TYPES.infantry.buildTimeMs + 1);
    const attackerId = Object.keys(state.units).find((id) => state.units[id].ownerId === "A")!;

    state = issueMoveOrder(state, "move-to-field", "A", attackerId, "FIELD");
    state = advanceTime(state, UNIT_TYPES.infantry.moveTimeMs + 1);

    state = issueMoveOrder(state, "attack-city-b", "A", attackerId, "CITY_B");
    state = advanceTime(state, UNIT_TYPES.infantry.moveTimeMs + 1);

    // A lone infantry (attack 8) can't clear a defending tank (defense 12) in
    // one round — it survives but bounces back without capturing the city.
    expect(state.units[attackerId]).toBeDefined();
    expect(state.units[attackerId].provinceId).toBe("FIELD");
    expect(state.units[attackerId].health).toBeLessThan(100);
    expect(state.provinces.CITY_B.ownerId).toBe("B");
  });

  it("clears a critically wounded defender but doesn't capture with a non-capturing unit", () => {
    let state = withResources(scenario(), "A");
    state = withResources(state, "B");
    // B stations a defender in CITY_B, already critically wounded (isolates
    // the capture-on-victory code path from overall combat-balance tuning:
    // health is large relative to a single hit, so clearing a garrison at
    // full health typically takes more than one arriving unit).
    state = issueBuildOrder(state, "b-infantry", "B", "CITY_B", "infantry");
    state = advanceTime(state, UNIT_TYPES.infantry.buildTimeMs + 1);
    const defenderId = Object.keys(state.units).find((id) => state.units[id].ownerId === "B")!;
    state = {
      ...state,
      units: { ...state.units, [defenderId]: { ...state.units[defenderId], health: 1 } },
    };

    state = issueBuildOrder(state, "a-tank", "A", "CITY_A", "tank");
    state = advanceTime(state, UNIT_TYPES.tank.buildTimeMs + 1);
    const attackerId = Object.keys(state.units).find((id) => state.units[id].ownerId === "A")!;

    state = issueMoveOrder(state, "move-to-field", "A", attackerId, "FIELD");
    state = advanceTime(state, UNIT_TYPES.tank.moveTimeMs + 1);
    state = issueMoveOrder(state, "attack-city-b", "A", attackerId, "CITY_B");
    state = advanceTime(state, UNIT_TYPES.tank.moveTimeMs + 1);

    expect(state.units[defenderId]).toBeUndefined();
    expect(state.units[attackerId].provinceId).toBe("CITY_B");
    expect(state.provinces.CITY_B.ownerId).toBe("B"); // tanks can't capture
  });

  it("captures the city once infantry clears a critically wounded defender", () => {
    let state = withResources(scenario(), "A");
    state = withResources(state, "B");
    state = issueBuildOrder(state, "b-infantry", "B", "CITY_B", "infantry");
    state = advanceTime(state, UNIT_TYPES.infantry.buildTimeMs + 1);
    const defenderId = Object.keys(state.units).find((id) => state.units[id].ownerId === "B")!;
    state = {
      ...state,
      units: { ...state.units, [defenderId]: { ...state.units[defenderId], health: 1 } },
    };

    state = issueBuildOrder(state, "a-infantry", "A", "CITY_A", "infantry");
    state = advanceTime(state, UNIT_TYPES.infantry.buildTimeMs + 1);
    const attackerId = Object.keys(state.units).find((id) => state.units[id].ownerId === "A")!;

    state = issueMoveOrder(state, "move-to-field", "A", attackerId, "FIELD");
    state = advanceTime(state, UNIT_TYPES.infantry.moveTimeMs + 1);
    state = issueMoveOrder(state, "attack-city-b", "A", attackerId, "CITY_B");
    state = advanceTime(state, UNIT_TYPES.infantry.moveTimeMs + 1);

    expect(state.units[defenderId]).toBeUndefined();
    expect(state.units[attackerId].provinceId).toBe("CITY_B");
    expect(state.provinces.CITY_B.ownerId).toBe("A");
  });
});
