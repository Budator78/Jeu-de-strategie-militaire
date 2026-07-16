import { describe, expect, it } from "vitest";
import { createGameState } from "../state/createGameState";
import { advanceTime } from "../turn/advanceTime";
import {
  declareWarOn,
  hasOfferedPeace,
  hasRightOfWay,
  offerPeace,
  retractPeaceOffer,
  setRightOfWay,
} from "../turn/diplomacy";
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

describe("declareWarOn / peace offers", () => {
  it("a lone peace offer does NOT end the war — both sides must agree", () => {
    let state = declareWarOn(scenario(), "A", "B");
    expect(state.countries.A.atWarWith).toContain("B");
    expect(state.events.some((e) => e.kind === "warDeclared")).toBe(true);

    state = offerPeace(state, "A", "B");
    expect(hasOfferedPeace(state, "A", "B")).toBe(true);
    expect(state.countries.A.atWarWith).toContain("B"); // still at war
    expect(state.events.some((e) => e.kind === "peaceOffered")).toBe(true);
    expect(state.events.some((e) => e.kind === "peaceMade")).toBe(false);
  });

  it("the war ends once the other side offers too (acceptance)", () => {
    let state = declareWarOn(scenario(), "A", "B");
    state = offerPeace(state, "A", "B");
    state = offerPeace(state, "B", "A");

    expect(state.countries.A.atWarWith).not.toContain("B");
    expect(state.countries.B.atWarWith).not.toContain("A");
    expect(state.countries.A.stances.B).toBeUndefined();
    expect(hasOfferedPeace(state, "A", "B")).toBe(false);
    expect(hasOfferedPeace(state, "B", "A")).toBe(false);
    expect(state.events.some((e) => e.kind === "peaceMade")).toBe(true);
  });

  it("offers can be retracted before acceptance", () => {
    let state = declareWarOn(scenario(), "A", "B");
    state = offerPeace(state, "A", "B");
    state = retractPeaceOffer(state, "A", "B");
    expect(hasOfferedPeace(state, "A", "B")).toBe(false);

    // B "accepting" now just opens a fresh offer of its own.
    state = offerPeace(state, "B", "A");
    expect(state.countries.A.atWarWith).toContain("B");
  });

  it("offering without war, offering twice, and re-declaring war are no-ops", () => {
    const peaceful = scenario();
    expect(offerPeace(peaceful, "A", "B")).toBe(peaceful);

    let state = declareWarOn(peaceful, "A", "B");
    state = offerPeace(state, "A", "B");
    expect(offerPeace(state, "A", "B")).toBe(state);
    expect(declareWarOn(state, "B", "A")).toBe(state);
  });

  it("declaring war clears any stale offers between the two", () => {
    let state = declareWarOn(scenario(), "A", "B");
    state = offerPeace(state, "A", "B");
    state = offerPeace(state, "B", "A"); // peace concluded
    state = declareWarOn(state, "B", "A"); // new war
    expect(hasOfferedPeace(state, "A", "B")).toBe(false);
    expect(state.countries.A.atWarWith).toContain("B");
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

    state = offerPeace(state, "A", "B");
    state = offerPeace(state, "B", "A");
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
