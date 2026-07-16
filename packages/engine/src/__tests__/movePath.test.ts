import { describe, expect, it } from "vitest";
import { createGameState } from "../state/createGameState";
import { advanceTime } from "../turn/advanceTime";
import { cancelUnitMoves, issueMovePathOrder } from "../turn/orders";
import { UNIT_TYPES } from "../state/UnitTypes";

const HOP = UNIT_TYPES.infantry.moveTimeMs;

function scenario() {
  return createGameState({
    provinces: [
      { id: "P1", name: "P1", neighbors: ["P2"], ownerId: "A", isCity: true, resources: { money: 5 } },
      { id: "P2", name: "P2", neighbors: ["P1", "P3"], ownerId: "A", resources: { money: 5 } },
      { id: "P3", name: "P3", neighbors: ["P2", "P4"], ownerId: "A", resources: { money: 5 } },
      { id: "P4", name: "P4", neighbors: ["P3"], ownerId: "B", resources: { money: 5 } },
    ],
    countries: [
      { id: "A", name: "Country A", isAI: false, capitalProvinceId: "P1" },
      { id: "B", name: "Country B", isAI: true, capitalProvinceId: "P4" },
    ],
    startingUnits: [{ id: "u1", countryId: "A", provinceId: "P1", unitType: "infantry" }],
    rngSeed: 4,
  });
}

describe("issueMovePathOrder", () => {
  it("walks a multi-hop route to the destination, one hop at a time", () => {
    let state = issueMovePathOrder(scenario(), "m1", "A", "u1", ["P2", "P3"]);
    expect(state.pendingOrders).toHaveLength(1);

    state = advanceTime(state, HOP + 1);
    expect(state.units.u1.provinceId).toBe("P2");
    expect(state.pendingOrders).toHaveLength(1); // next hop auto-queued

    state = advanceTime(state, HOP + 1);
    expect(state.units.u1.provinceId).toBe("P3");
    expect(state.pendingOrders).toHaveLength(0); // route complete
  });

  it("rejects routes with non-adjacent steps", () => {
    const state = scenario();
    expect(issueMovePathOrder(state, "m1", "A", "u1", ["P3"])).toBe(state);
    expect(issueMovePathOrder(state, "m1", "A", "u1", ["P2", "P4"])).toBe(state);
  });

  it("re-ordering a marching unit replaces its route (redirect)", () => {
    let state = issueMovePathOrder(scenario(), "m1", "A", "u1", ["P2", "P3", "P4"]);
    state = advanceTime(state, HOP + 1); // arrived P2, next hop P3 queued
    state = issueMovePathOrder(state, "m2", "A", "u1", ["P1"]); // turn back
    expect(state.pendingOrders).toHaveLength(1);
    state = advanceTime(state, HOP + 1);
    expect(state.units.u1.provinceId).toBe("P1");
    expect(state.pendingOrders).toHaveLength(0);
  });

  it("cancelUnitMoves halts the unit where it stands", () => {
    let state = issueMovePathOrder(scenario(), "m1", "A", "u1", ["P2", "P3"]);
    state = cancelUnitMoves(state, "A", "u1");
    expect(state.pendingOrders).toHaveLength(0);
    state = advanceTime(state, HOP * 3);
    expect(state.units.u1.provinceId).toBe("P1");
  });

  it("a combat bounce drops the rest of the route", () => {
    let state = scenario();
    // Strong garrison in enemy P4 so the attacker bounces.
    state = {
      ...state,
      units: {
        ...state.units,
        d1: { id: "d1", type: "tank" as const, ownerId: "B", provinceId: "P4", health: 100, attack: 16, defense: 12 },
        d2: { id: "d2", type: "tank" as const, ownerId: "B", provinceId: "P4", health: 100, attack: 16, defense: 12 },
      },
    };
    state = issueMovePathOrder(state, "m1", "A", "u1", ["P2", "P3", "P4", "P3"]);
    state = advanceTime(state, HOP + 1);
    state = advanceTime(state, HOP + 1);
    expect(state.units.u1.provinceId).toBe("P3");
    state = advanceTime(state, HOP + 1); // attack into P4 → bounce (or death)
    if (state.units.u1) {
      expect(state.units.u1.provinceId).toBe("P3"); // bounced, stayed put
      expect(state.pendingOrders).toHaveLength(0); // path dropped
    }
  });
});
