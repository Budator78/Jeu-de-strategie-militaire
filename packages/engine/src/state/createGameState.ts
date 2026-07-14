import type { BuildingId } from "./BuildingTypes";
import type { Country } from "./Country";
import type { GameConfig, GameState } from "./GameState";
import type { Province } from "./Province";
import type { ResourceAmounts } from "./ResourceTypes";
import { DEFAULT_PROVINCE_MONEY_YIELD, DEFAULT_PROVINCE_VP, DEFAULT_VICTORY_POINT_TARGET } from "../rules/balance";

export interface ProvinceInput {
  id: string;
  name: string;
  neighbors: string[];
  ownerId: string | null;
  isCity?: boolean;
  resources?: ResourceAmounts;
  victoryPoints?: number;
  buildings?: BuildingId[];
}

export interface CountryInput {
  id: string;
  name: string;
  isAI: boolean;
  capitalProvinceId: string | null;
}

export interface CreateGameStateInput {
  provinces: ProvinceInput[];
  countries: CountryInput[];
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
    };
  }

  return {
    clockMs: 0,
    status: "inProgress",
    winnerId: null,
    provinces,
    countries,
    units: {},
    pendingOrders: [],
    rngState: input.rngSeed ?? 1,
    config: { unlimitedGold: true, victoryPointTarget: DEFAULT_VICTORY_POINT_TARGET, ...input.config },
  };
}
