import { describe, expect, it } from "vitest";
import { createGameState } from "../state/createGameState";
import { advanceTime } from "../turn/advanceTime";
import { declareWarOn, hasRightOfWay, makePeace, setRightOfWay } from "../turn/diplomacy";
import { issueMoveOrder } from "../turn/orders";
import { UNIT_TYPES } from "../state/UnitTypes";

function scenario() {
  return createGameState({
    provinces: [
      { id: "A1", name: "A One", neighbors: ["B1"], ownerId: "A", isCity: true, resources: { money: 5 } },
      { id: "B1", name: "B One", neighbors: ["A1", "B2"], ownerId: "B", resources: { money: 5 } },
      { id: "B2", name: "B Two", neighbors: ["B1"], ownerId: "B", isCity: true, resources: { money: 5 } },
    ],
    countries: [
      { id: "A", name: "Country A", isAI: false, capitalProvinceId: "A1" },
      { id: "B", name: "Country B", isAI: true, capitalProvinceId: "B2" },
    ],
    rngSeed: 9,
  });
}

function withUnit(state: ReturnType<typeof scenario>, id: string, ownerId: string, provinceId: string) {
  return {
    ...state,
    units: {
      ...state.units,
      [id]: { id, type: "infantry" as const, ownerId, provinceId, health: 100, attack: 8, defense: 10 },
    },
  };
}

describe("declareWarOn / makePeace", () => {
  it("war is mutual and logged; peace clears it on both sides", () => {
    let state = declareWarOn(scenario(), "A", "B");
    expect(state.countries.A.atWarWith).toContain("B");
    expect(state.countries.B.atWarWith).toContain("A");
    expect(state.countries.A.stances.B).toBe("war");
    expect(state.events.some((e) => e.kind === "warDeclared")).toBe(true);

    state = makePeace(state, "B", "A");
    expect(state.countries.A.atWarWith).not.toContain("B");
    expect(state.countries.B.atWarWith).not.toContain("A");
    expect(state.countries.A.stances.B).toBeUndefined();
    expect(state.events.some((e) => e.kind === "peaceMade")).toBe(true);
  });

  it("declaring war twice or making peace without war are no-ops", () => {
    let state = declareWarOn(scenario(), "A", "B");
    const again = declareWarOn(state, "B", "A");
    expect(again).toBe(state);

    state = makePeace(state, "A", "B");
    const peaceAgain = makePeace(state, "A", "B");
    expect(peaceAgain).toBe(state);
  });
});

describe("right of way", () => {
  it("lets granted units transit foreign land without war or capture", () => {
    let state = setRightOfWay(scenario(), "B", "A", true);
    expect(hasRightOfWay(state, "B", "A")).toBe(true);

    state = withUnit(state, "u1", "A", "A1");
    state = issueMoveOrder(state, "m1", "A", "u1", "B1");
    state = advanceTime(state, UNIT_TYPES.infantry.moveTimeMs + 1);

    expect(state.units.u1.provinceId).toBe("B1");
    expect(state.provinces.B1.ownerId).toBe("B"); // no capture
    expect(state.countries.A.atWarWith).toHaveLength(0); // no war
  });

  it("without right of way the same move declares war and captures", () => {
    let state = withUnit(scenario(), "u1", "A", "A1");
    state = issueMoveOrder(state, "m1", "A", "u1", "B1");
    state = advanceTime(state, UNIT_TYPES.infantry.moveTimeMs + 1);

    expect(state.provinces.B1.ownerId).toBe("A");
    expect(state.countries.A.atWarWith).toContain("B");
  });

  it("cannot be granted while at war, and revocation works", () => {
    let state = declareWarOn(scenario(), "A", "B");
    const refused = setRightOfWay(state, "B", "A", true);
    expect(refused).toBe(state);

    state = makePeace(state, "A", "B");
    state = setRightOfWay(state, "B", "A", true);
    expect(hasRightOfWay(state, "B", "A")).toBe(true);
    state = setRightOfWay(state, "B", "A", false);
    expect(hasRightOfWay(state, "B", "A")).toBe(false);
  });

  it("is one-directional: A crossing B's land doesn't let B cross A's", () => {
    const state = setRightOfWay(scenario(), "B", "A", true);
    expect(hasRightOfWay(state, "B", "A")).toBe(true);
    expect(hasRightOfWay(state, "A", "B")).toBe(false);
  });
});
