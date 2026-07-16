import { produce } from "immer";
import { BUILDING_TYPES } from "../state/BuildingTypes";
import { MAX_EVENTS } from "../state/GameEvents";
import type { GameState } from "../state/GameState";
import type { Province } from "../state/Province";
import {
  CITY_HEAL_PER_DAY,
  HOMELAND_MORALE_TARGET,
  MORALE_BOOST_AMOUNT,
  MORALE_BOOST_GOLD_COST,
  MORALE_DRIFT_PER_DAY,
  OCCUPIED_MORALE_TARGET,
  UPRISING_CHANCE_PER_DAY,
  UPRISING_MORALE_THRESHOLD,
  UPRISING_RESET_MORALE,
} from "../rules/balance";
import { nextRandom } from "../utils/rng";

const DAY_MS = 86_400_000;

/**
 * Hp-per-day a province heals friendly units at: the base city rate, or 0 on
 * plain land unless a Field Hospital enables province healing, plus any
 * hospital bonus. Occupied/foreign land doesn't heal you.
 */
function provinceHealPerDay(province: Province, unitOwnerId: string): number {
  if (province.ownerId !== unitOwnerId) return 0;
  const bonus = province.buildings.reduce((sum, b) => sum + (BUILDING_TYPES[b].healBonusPerDay ?? 0), 0);
  if (province.isCity) return CITY_HEAL_PER_DAY + bonus;
  const canHeal = province.buildings.some((b) => BUILDING_TYPES[b].enablesProvinceHealing);
  return canHeal ? CITY_HEAL_PER_DAY + bonus : 0;
}

/**
 * Continuous morale simulation, run from advanceTime:
 * - every province drifts toward its target (homeland high, occupied low);
 * - occupied land below the uprising threshold, left ungarrisoned by its
 *   occupier, has a daily chance to revolt and return to its homeland
 *   (buildings destroyed, morale partially restored) — per the wiki's
 *   "less than 35% morale, chance for an uprising";
 * - units garrisoned in a friendly city slowly heal.
 */
export function resolveMorale(state: GameState, elapsedMs: number): GameState {
  if (elapsedMs <= 0) return state;
  const drift = MORALE_DRIFT_PER_DAY * (elapsedMs / DAY_MS);
  const uprisingChance = UPRISING_CHANCE_PER_DAY * (elapsedMs / DAY_MS);
  const dayFraction = elapsedMs / DAY_MS;

  return produce(state, (draft) => {
    const garrisonedBy = new Map<string, Set<string>>();
    for (const unit of Object.values(draft.units)) {
      let owners = garrisonedBy.get(unit.provinceId);
      if (!owners) {
        owners = new Set();
        garrisonedBy.set(unit.provinceId, owners);
      }
      owners.add(unit.ownerId);
    }

    for (const province of Object.values(draft.provinces)) {
      if (province.ownerId === null) continue;
      const isHomeland = province.ownerId === province.homelandOf;
      const occupierPresent = garrisonedBy.get(province.id)?.has(province.ownerId) ?? false;
      const target = isHomeland ? HOMELAND_MORALE_TARGET : OCCUPIED_MORALE_TARGET;
      if (province.morale < target) {
        // Occupied land only calms down while the occupier garrisons it —
        // left unheld, the population stays restive (and uprising-prone).
        if (isHomeland || occupierPresent) {
          province.morale = Math.min(target, province.morale + drift);
        }
      } else if (province.morale > target && !isHomeland) {
        // Occupied land also sinks toward its (low) target — e.g. right after
        // a gold boost pushed it above.
        province.morale = Math.max(target, province.morale - drift);
      }

      if (
        !isHomeland &&
        province.homelandOf !== null &&
        province.morale < UPRISING_MORALE_THRESHOLD &&
        !occupierPresent
      ) {
        const { value, nextSeed } = nextRandom(draft.rngState);
        draft.rngState = nextSeed;
        if (value < uprisingChance) {
          draft.events.push({
            kind: "uprising",
            atMs: draft.clockMs,
            provinceId: province.id,
            provinceName: province.name,
            occupierId: province.ownerId,
            homelandId: province.homelandOf,
          });
          province.ownerId = province.homelandOf;
          province.buildings = [];
          province.morale = UPRISING_RESET_MORALE;
        }
      }
    }

    for (const unit of Object.values(draft.units)) {
      if (unit.health >= 100) continue;
      const province = draft.provinces[unit.provinceId];
      if (!province) continue;
      const healPerDay = provinceHealPerDay(province, unit.ownerId);
      if (healPerDay > 0) {
        unit.health = Math.min(100, unit.health + healPerDay * dayFraction);
      }
    }

    if (draft.events.length > MAX_EVENTS) {
      draft.events.splice(0, draft.events.length - MAX_EVENTS);
    }
  });
}

/**
 * The city panel's smiley button: spend gold for an instant morale bump.
 * Refused if the country doesn't own the province or can't pay.
 */
export function boostMoraleWithGold(state: GameState, countryId: string, provinceId: string): GameState {
  const province = state.provinces[provinceId];
  const country = state.countries[countryId];
  if (!province || !country) return state;
  if (province.ownerId !== countryId) return state;
  if (country.gold < MORALE_BOOST_GOLD_COST) return state;
  if (province.morale >= 100) return state;

  return produce(state, (draft) => {
    draft.countries[countryId].gold -= MORALE_BOOST_GOLD_COST;
    const draftProvince = draft.provinces[provinceId];
    draftProvince.morale = Math.min(100, draftProvince.morale + MORALE_BOOST_AMOUNT);
  });
}
