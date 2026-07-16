import type { BuildingId } from "./BuildingTypes";
import type { Country } from "./Country";
import type { GameConfig, GameState } from "./GameState";
import { createDefaultMarketOffers } from "./MarketTypes";
import type { Province } from "./Province";
import type { ResourceAmounts } from "./ResourceTypes";
import type { Unit } from "./Unit";
import { UNIT_TYPES, type UnitTypeId } from "./UnitTypes";
import {
  DEFAULT_PROVINCE_MONEY_YIELD,
  DEFAULT_PROVINCE_VP,
  DEFAULT_VICTORY_POINT_TARGET,
  STARTING_MORALE,
} from "../rules/balance";

export interface ProvinceInput {
  id: string;
  name: string;
  neighbors: string[];
  ownerId: string | null;
  isCity?: boolean;
  resources?: ResourceAmounts;
  victoryPoints?: number;
  buildings?: BuildingId[];
  morale?: number;
}

export interface CountryInput {
  id: string;
  name: string;
  isAI: boolean;
  capitalProvinceId: string | null;
}

export interface StartingUnitInput {
  id: string;
  countryId: string;
  provinceId: string;
  unitType: UnitTypeId;
}

export interface CreateGameStateInput {
  provinces: ProvinceInput[];
  countries: CountryInput[];
  /** Initial garrisons — every nation starts with some troops, per the source game. */
  startingUnits?: StartingUnitInput[];
  config?: Partial<GameConfig>;
  /** Seeds combat RNG (see utils/rng.ts). Defaults to a fixed value for reproducible tests. */
  rngSeed?: number;
}

export function createGameState(input: CreateGameStateInput): GameState {
  const provinces: Record<string, Province> = {};
  for (const p of input.provinces) {
    provinces[p.id] = {
      id: p.id,
      name: p.name,
      ownerId: p.ownerId,
      neighbors: p.neighbors,
      isCity: p.isCity ?? false,
      resources: p.resources ?? { money: DEFAULT_PROVINCE_MONEY_YIELD },
      victoryPoints: p.victoryPoints ?? DEFAULT_PROVINCE_VP,
      buildings: p.buildings ?? [],
      morale: p.morale ?? STARTING_MORALE,
      homelandOf: p.ownerId,
    };
  }

  const countries: Record<string, Country> = {};
  for (const c of input.countries) {
    countries[c.id] = {
      id: c.id,
      name: c.name,
      isAI: c.isAI,
      resources: {
        supplies: 0,
        components: 0,
        fuel: 0,
        electronics: 0,
        rareMaterials: 0,
        manpower: 0,
        money: 0,
      },
      gold: 0,
      researchedIds: [],
      capitalProvinceId: c.capitalProvinceId,
      alive: true,
      atWarWith: [],
      stances: {},
      peaceOffersTo: [],
    };
  }

  const units: Record<string, Unit> = {};
  for (const u of input.startingUnits ?? []) {
    const def = UNIT_TYPES[u.unitType];
    units[u.id] = {
      id: u.id,
      type: u.unitType,
      ownerId: u.countryId,
      provinceId: u.provinceId,
      health: 100,
      attack: def.attack,
      defense: def.defense,
    };
  }

  return {
    clockMs: 0,
    status: "inProgress",
    winnerId: null,
    provinces,
    countries,
    units,
    pendingOrders: [],
    rngState: input.rngSeed ?? 1,
    market: createDefaultMarketOffers(),
    events: [],
    articles: [],
    config: { unlimitedGold: true, victoryPointTarget: DEFAULT_VICTORY_POINT_TARGET, ...input.config },
  };
}
