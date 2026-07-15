import type { CreateGameStateInput, ResourceAmounts, ResourceType, UnitTypeId } from '@con/engine'
import { adjacency, provinceFeatures } from '../data/geoData'

/**
 * Display names for the countries mapped at admin-1 detail (their features
 * are regions, so features[0].name_en would be a region name, not the
 * country). Rest-of-world countries are single admin-0 features whose own
 * name_en is already correct.
 */
const COUNTRY_NAMES: Record<string, string> = {
  DEU: 'Germany',
  FRA: 'France',
  POL: 'Poland',
  BEL: 'Belgium',
  NLD: 'Netherlands',
  LUX: 'Luxembourg',
  CZE: 'Czech Republic',
  AUT: 'Austria',
  CHE: 'Switzerland',
}

/**
 * Only these AI countries actively play themselves (build/construct/research/
 * attack — see ai/basicAI.ts). Every other nation is a "passive" AI: it owns
 * its territory and starts with a garrison like everyone else, but never
 * issues an order of its own — see state/gameStore.ts's runAI.
 */
export const ACTIVE_AI_COUNTRY_CODES = ['FRA']

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
 * same pattern for now since no equivalent breakdown was available. Every
 * other country just gets its capital marked as a single generic city —
 * we don't have a researched city list for all ~240 of them.
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
/** VP bonus for a capital that doesn't have a researched population figure (see CityConfig.size). */
const GENERIC_CAPITAL_VP = 5

const SPECIALIZABLE_RESOURCES: ResourceType[] = [
  'supplies',
  'components',
  'fuel',
  'electronics',
  'rareMaterials',
]

/** Every nation starts with the same small garrison — no doctrines/starting-unit research modeled yet. */
const STARTING_GARRISON: UnitTypeId[] = ['infantry', 'infantry']

export function buildScenario(humanCountryId: string): CreateGameStateInput {
  const featuresByCountry = new Map<string, typeof provinceFeatures>()
  for (const f of provinceFeatures) {
    const code = f.properties.adm0_a3
    const list = featuresByCountry.get(code)
    if (list) list.push(f)
    else featuresByCountry.set(code, [f])
  }

  const provinces: CreateGameStateInput['provinces'] = []
  const countries: CreateGameStateInput['countries'] = []
  const startingUnits: NonNullable<CreateGameStateInput['startingUnits']> = []

  for (const [countryCode, features] of featuresByCountry) {
    const capitalProvinceId = CAPITAL_PROVINCE_ID[countryCode] ?? features[0].id
    const countryName = COUNTRY_NAMES[countryCode] ?? features[0].properties.name_en

    for (const f of features) {
      const isCapital = f.id === capitalProvinceId
      const cityConfig = COUNTRY_CITIES[countryCode]?.find((c) => c.provinceId === f.id)
      const isCity = Boolean(cityConfig) || isCapital

      const resources: ResourceAmounts = isCity
        ? {
            money: CITY_MONEY_PER_MIN + (isCapital ? CAPITAL_BONUS_MONEY_PER_MIN : 0),
            manpower: CITY_MANPOWER_PER_MIN,
            ...Object.fromEntries(
              SPECIALIZABLE_RESOURCES.map((resource) => [
                resource,
                resource === cityConfig?.specialResource ? CITY_SPECIALTY_RATE_PER_MIN : CITY_BASELINE_RATE_PER_MIN,
              ]),
            ),
          }
        : { money: BASE_PROVINCE_MONEY_PER_MIN }

      provinces.push({
        id: f.id,
        name: f.properties.name_en,
        neighbors: adjacency[f.id] ?? [],
        // Every country owns its own territory from the start — no more neutral wilderness.
        ownerId: countryCode,
        isCity,
        resources,
        victoryPoints: cityConfig?.size ?? (isCapital ? GENERIC_CAPITAL_VP : undefined),
      })
    }

    countries.push({
      id: countryCode,
      name: countryName,
      isAI: countryCode !== humanCountryId,
      capitalProvinceId,
    })

    STARTING_GARRISON.forEach((unitType, index) => {
      startingUnits.push({
        id: `start:${countryCode}:${index}`,
        countryId: countryCode,
        provinceId: capitalProvinceId,
        unitType,
      })
    })
  }

  return { provinces, countries, startingUnits }
}
