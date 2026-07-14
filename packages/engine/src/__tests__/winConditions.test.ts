import { describe, expect, it } from "vitest";
import { createGameState } from "../state/createGameState";
import { advanceTime } from "../turn/advanceTime";
import { computeVictoryPoints } from "../rules/winConditions";

function scenario(victoryPointTarget: number) {
  return createGameState({
    provinces: [
      { id: "P1", name: "P1", neighbors: [], ownerId: "A", victoryPoints: 5 },
      { id: "P2", name: "P2", neighbors: [], ownerId: "A", victoryPoints: 3 },
      { id: "CAP_A", name: "Capital A", neighbors: [], ownerId: "A", isCity: true, victoryPoints: 10 },
      { id: "CAP_B", name: "Capital B", neighbors: [], ownerId: "B", isCity: true, victoryPoints: 10 },
    ],
    countries: [
      { id: "A", name: "Country A", isAI: false, capitalProvinceId: "CAP_A" },
      { id: "B", name: "Country B", isAI: true, capitalProvinceId: "CAP_B" },
    ],
    config: { victoryPointTarget },
  });
}

describe("computeVictoryPoints", () => {
  it("sums victoryPoints across owned provinces", () => {
    const state = scenario(999);
    expect(computeVictoryPoints(state, "A")).toBe(5 + 3 + 10);
    expect(computeVictoryPoints(state, "B")).toBe(10);
  });
});

describe("checkWinConditions via advanceTime", () => {
  it("stays in progress below the VP target and with both capitals held", () => {
    const state = advanceTime(scenario(999), 1000);
    expect(state.status).toBe("inProgress");
    expect(state.winnerId).toBeNull();
  });

  it("ends the game once a country crosses the VP target", () => {
    // Country A already has 18 VP; set a target it has already crossed.
    const state = advanceTime(scenario(10), 1000);
    expect(state.status).toBe("ended");
    expect(state.winnerId).toBe("A");
  });

  it("ends by elimination when a country loses its capital, even below the VP target", () => {
    let state = scenario(999);
    state = {
      ...state,
      provinces: { ...state.provinces, CAP_B: { ...state.provinces.CAP_B, ownerId: "A" } },
    };
    state = advanceTime(state, 1000);
    expect(state.status).toBe("ended");
    expect(state.winnerId).toBe("A");
  });

  it("freezes the simulation once the game has ended", () => {
    let state = advanceTime(scenario(10), 1000);
    expect(state.status).toBe("ended");
    const clockBefore = state.clockMs;
    state = advanceTime(state, 5000);
    expect(state.clockMs).toBe(clockBefore);
  });
});
