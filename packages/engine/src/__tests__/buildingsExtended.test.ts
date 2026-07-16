import { describe, expect, it } from "vitest";
import { createGameState } from "../state/createGameState";
import { advanceTime } from "../turn/advanceTime";
import { issueBuildOrder, issueConstructOrder, issueMoveOrder } from "../turn/orders";
import { provinceYieldMultiplier } from "../turn/economyResolver";
import { canPlaceBuilding, provinceDefenseBonus, BUILDING_TYPES } from "../state/BuildingTypes";
import { UNIT_TYPES } from "../state/UnitTypes";

const DAY_MS = 86_400_000;

function scenario() {
  return createGameState({
    provinces: [
      { id: "HOME", name: "Home City", neighbors: ["FIELD"], ownerId: "A", isCity: true, resources: { money: 10 } },
      { id: "FIELD", name: "Field", neighbors: ["HOME", "ENEMY"], ownerId: "A", resources: { money: 10 } },
      { id: "ENEMY", name: "Enemy City", neighbors: ["FIELD"], ownerId: "B", isCity: true, resources: { money: 10 } },
    ],
    countries: [
      { id: "A", name: "Country A", isAI: false, capitalProvinceId: "HOME" },
      { id: "B", name: "Country B", isAI: true, capitalProvinceId: "ENEMY" },
    ],
    rngSeed: 2,
  });
}

function rich(state: ReturnType<typeof scenario>, countryId: string) {
  return {
    ...state,
    countries: {
      ...state.countries,
      [countryId]: {
        ...state.countries[countryId],
        resources: {
          supplies: 99999,
          components: 99999,
          fuel: 99999,
          electronics: 99999,
          rareMaterials: 99999,
          manpower: 99999,
          money: 99999,
        },
      },
    },
  }
}

describe("building placement rules", () => {
  it("allows province buildings only on non-city provinces, city buildings only on cities", () => {
    const state = scenario();
    expect(canPlaceBuilding(state.provinces.HOME, "A", "armsIndustry")).toBe(true);
    expect(canPlaceBuilding(state.provinces.HOME, "A", "localIndustry")).toBe(false);
    expect(canPlaceBuilding(state.provinces.FIELD, "A", "localIndustry")).toBe(true);
    expect(canPlaceBuilding(state.provinces.FIELD, "A", "armsIndustry")).toBe(false);
  });

  it("Annex City is only placeable in an occupied city, Army Base only in a homeland city", () => {
    let state = rich(scenario(), "A");
    // Capture the enemy city.
    state = { ...state, units: { atk: { id: "atk", type: "infantry", ownerId: "A", provinceId: "FIELD", health: 100, attack: 8, defense: 10 } } };
    state = issueMoveOrder(state, "m1", "A", "atk", "ENEMY");
    state = advanceTime(state, UNIT_TYPES.infantry.moveTimeMs + 1);
    expect(state.provinces.ENEMY.ownerId).toBe("A");

    expect(canPlaceBuilding(state.provinces.ENEMY, "A", "annexCity")).toBe(true);
    expect(canPlaceBuilding(state.provinces.ENEMY, "A", "armyBase")).toBe(false); // occupied, not homeland
    expect(canPlaceBuilding(state.provinces.HOME, "A", "annexCity")).toBe(false); // homeland, not occupied
    expect(canPlaceBuilding(state.provinces.HOME, "A", "armyBase")).toBe(true);
  });
});

describe("Annex City raises occupied production", () => {
  it("can be built in an occupied city, and doubles its status factor (25% → 50%)", () => {
    // A occupies the enemy city directly (owner A, homeland B), with a garrison
    // so it stays put during the build.
    let state = rich(scenario(), "A");
    state = {
      ...state,
      provinces: { ...state.provinces, ENEMY: { ...state.provinces.ENEMY, ownerId: "A", morale: 40 } },
      units: { atk: { id: "atk", type: "infantry", ownerId: "A", provinceId: "ENEMY", health: 100, attack: 8, defense: 10 } },
    };

    state = issueConstructOrder(state, "c1", "A", "ENEMY", "annexCity");
    expect(state.pendingOrders).toHaveLength(1);
    state = advanceTime(state, BUILDING_TYPES.annexCity.buildTimeMs + 1);
    expect(state.provinces.ENEMY.buildings).toContain("annexCity");

    // Compare at a single, fixed morale so only the status factor differs.
    const annexed = { ...state.provinces.ENEMY, morale: 40 };
    const notAnnexed = { ...annexed, buildings: [] as never[] };
    expect(provinceYieldMultiplier(annexed)).toBeCloseTo(0.4 * 0.5, 5);
    expect(provinceYieldMultiplier(notAnnexed)).toBeCloseTo(0.4 * 0.25, 5);
  });
});

describe("Air Base gates air mobilization", () => {
  it("refuses to mobilize a fighter without an Air Base, allows it once built", () => {
    let state = rich(scenario(), "A");
    const refused = issueBuildOrder(state, "b1", "A", "HOME", "fighter");
    expect(refused).toBe(state);

    state = issueConstructOrder(state, "c1", "A", "HOME", "airBase");
    state = advanceTime(state, BUILDING_TYPES.airBase.buildTimeMs + 1);
    expect(state.provinces.HOME.buildings).toContain("airBase");

    const accepted = issueBuildOrder(state, "b2", "A", "HOME", "fighter");
    expect(accepted).not.toBe(state);
  });
});

describe("defensive buildings harden the garrison", () => {
  it("sums the defense bonus of a province's buildings", () => {
    const state = scenario();
    const withBunkers = {
      ...state.provinces.HOME,
      buildings: ["undergroundBunkers" as const, "armyBase" as const],
    };
    // 0.4 + 0.25
    expect(provinceDefenseBonus(withBunkers)).toBeCloseTo(0.65, 5);
    expect(provinceDefenseBonus(state.provinces.HOME)).toBe(0);
  });

  it("lets a fortified defender survive an attack that would otherwise clear it", () => {
    // Bare-defense control: a lone infantry defender vs a tank usually falls fast.
    // With bunkers, it should take meaningfully less damage over one exchange.
    function runOnce(withBunkers: boolean) {
      let state = scenario();
      state = {
        ...state,
        provinces: {
          ...state.provinces,
          ENEMY: { ...state.provinces.ENEMY, buildings: withBunkers ? ["undergroundBunkers"] : [] },
        },
        countries: {
          ...state.countries,
          A: { ...state.countries.A, atWarWith: ["B"], stances: { B: "war" as const } },
          B: { ...state.countries.B, atWarWith: ["A"], stances: { A: "war" as const } },
        },
        units: {
          def: { id: "def", type: "infantry", ownerId: "B", provinceId: "ENEMY", health: 100, attack: 8, defense: 10 },
          atk: { id: "atk", type: "tank", ownerId: "A", provinceId: "FIELD", health: 100, attack: 16, defense: 12 },
        },
      };
      state = issueMoveOrder(state, "m1", "A", "atk", "ENEMY");
      state = advanceTime(state, UNIT_TYPES.tank.moveTimeMs + 1);
      return state.units.def?.health ?? 0;
    }
    expect(runOnce(true)).toBeGreaterThan(runOnce(false));
  });
});

describe("hospitals heal", () => {
  it("a Field Hospital lets a plain province heal friendly units", () => {
    let state = rich(scenario(), "A");
    state = {
      ...state,
      units: { wounded: { id: "wounded", type: "infantry", ownerId: "A", provinceId: "FIELD", health: 50, attack: 8, defense: 10 } },
    };
    // No healing on a plain field without a hospital.
    let noHospital = advanceTime(state, DAY_MS);
    expect(noHospital.units.wounded.health).toBe(50);

    state = issueConstructOrder(state, "c1", "A", "FIELD", "fieldHospital");
    state = advanceTime(state, BUILDING_TYPES.fieldHospital.buildTimeMs + 1);
    const healthAfterBuild = state.units.wounded.health;
    state = advanceTime(state, DAY_MS);
    expect(state.units.wounded.health).toBeGreaterThan(healthAfterBuild);
  });
});
