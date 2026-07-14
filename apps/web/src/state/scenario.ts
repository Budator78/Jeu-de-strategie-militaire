import type { CreateGameStateInput, ResourceAmounts, ResourceType } from '@con/engine'
import { adjacency, provinceFeatures } from '../data/geoData'

const COUNTRY_NAMES: Record<string, string> = {
  DEU: 'Germany',
  FRA: 'France',
}

/** Only these countries start as active players; the rest of the map is neutral. */
const PLAYER_COUNTRY_CODES = ['DEU', 'FRA']

const CAPITAL_PROVINCE_ID: Record<string, string> = {
  DEU: 'DE-BE', // Berlin
  FRA: 'FR-IDF', // Île-de-France (Paris)
}

interface CityConfig {
  provinceId: string
  /** Undefined = a generic city (capital or major port): money + manpower only. */
  specialResource?: ResourceType
  /** Display-only population/size badge shown on the map (not a simulated stat yet). */
  size: number
}

/**
 * Real cities (per the source game, only cities can mobilize units and each
 * usually specializes in one resource). Not from an authoritative in-game
 * list — approximated from the wiki's note that Germany has "8 starting
 * cities" with "two Supplies, Components and Electronics cities respectively"
 * and a deficiency (not absence) of Fuel/Rare Materials. France mirrors the
 * same pattern for now since no equivalent breakdown was available.
 */
const COUNTRY_CITIES: Record<string, CityConfig[]> = {
  DEU: [
    { provinceId: 'DE-BE', size: 12 }, // Berlin — capital
    { provinceId: 'DE-HH', size: 8 }, // Hamburg — major port
    { provinceId: 'DE-BY', specialResource: 'electronics', size: 7 }, // Bavaria
    { provinceId: 'DE-BW', specialResource: 'electronics', size: 7 }, // Baden-Württemberg
    { provinceId: 'DE-NW', specialResource: 'components', size: 9 }, // North Rhine-Westphalia
    { provinceId: 'DE-SN', specialResource: 'components', size: 6 }, // Saxony
    { provinceId: 'DE-NI', specialResource: 'supplies', size: 6 }, // Lower Saxony
    { provinceId: 'DE-HE', specialResource: 'supplies', size: 7 }, // Hesse
  ],
  FRA: [
    { provinceId: 'FR-IDF', size: 13 }, // Paris — capital
    { provinceId: 'FR-PAC', size: 8 }, // Marseille — major port
    { provinceId: 'FR-ARA', specialResource: 'electronics', size: 8 }, // Auvergne-Rhône-Alpes
    { provinceId: 'FR-NAQ', specialResource: 'electronics', size: 6 }, // Nouvelle-Aquitaine
    { provinceId: 'FR-HDF', specialResource: 'components', size: 7 }, // Hauts-de-France
    { provinceId: 'FR-GES', specialResource: 'components', size: 6 }, // Grand Est
    { provinceId: 'FR-OCC', specialResource: 'supplies', size: 6 }, // Occitanie
    { provinceId: 'FR-BRE', specialResource: 'supplies', size: 5 }, // Bretagne
  ],
}

/** province id -> display-only size badge, for cities only. */
export const CITY_SIZE: Record<string, number> = Object.fromEntries(
  Object.values(COUNTRY_CITIES)
    .flat()
    .map((c) => [c.provinceId, c.size]),
)

// All per-minute rates — the game runs continuously, not turn by turn.
const BASE_PROVINCE_MONEY_PER_MIN = 5
const CITY_MONEY_PER_MIN = 8
const CITY_MANPOWER_PER_MIN = 6
const CITY_SPECIALTY_RATE_PER_MIN = 4
/** A city's non-specialty resources still trickle in — "deficient", never flat zero. */
const CITY_BASELINE_RATE_PER_MIN = 1
const CAPITAL_BONUS_MONEY_PER_MIN = 10

const SPECIALIZABLE_RESOURCES: ResourceType[] = [
  'supplies',
  'components',
  'fuel',
  'electronics',
  'rareMaterials',
]

export function buildScenario(): CreateGameStateInput {
  const provinces: CreateGameStateInput['provinces'] = provinceFeatures.map((f) => {
    const countryCode = f.properties.adm0_a3
    const ownerId = PLAYER_COUNTRY_CODES.includes(countryCode) ? countryCode : null
    const isCapital = CAPITAL_PROVINCE_ID[countryCode] === f.id
    const cityConfig = COUNTRY_CITIES[countryCode]?.find((c) => c.provinceId === f.id)

    const resources: ResourceAmounts = cityConfig
      ? {
          money: CITY_MONEY_PER_MIN + (isCapital ? CAPITAL_BONUS_MONEY_PER_MIN : 0),
          manpower: CITY_MANPOWER_PER_MIN,
          ...Object.fromEntries(
            SPECIALIZABLE_RESOURCES.map((resource) => [
              resource,
              resource === cityConfig.specialResource
                ? CITY_SPECIALTY_RATE_PER_MIN
                : CITY_BASELINE_RATE_PER_MIN,
            ]),
          ),
        }
      : { money: BASE_PROVINCE_MONEY_PER_MIN }

    return {
      id: f.id,
      name: f.properties.name_en,
      neighbors: adjacency[f.id] ?? [],
      ownerId,
      isCity: Boolean(cityConfig),
      resources,
      // Per the wiki: every non-city province is 1 VP (the engine default);
      // a city's VP depends on population — we approximate with its size badge.
      victoryPoints: cityConfig?.size,
    }
  })

  const countries: CreateGameStateInput['countries'] = PLAYER_COUNTRY_CODES.map((code, index) => ({
    id: code,
    name: COUNTRY_NAMES[code],
    isAI: index !== 0,
    capitalProvinceId: CAPITAL_PROVINCE_ID[code] ?? null,
  }))

  return { provinces, countries }
}
