import type { Unit } from "../state/Unit";
import { nextRandom } from "../utils/rng";

export interface CombatOutcome {
  attackerHealth: number;
  attackerSurvived: boolean;
  /** Surviving defenders with updated health; dead defenders are omitted. */
  defenders: Unit[];
  nextRngSeed: number;
}

const VARIANCE_MIN = 0.85;
const VARIANCE_SPREAD = 0.3;

/** Ratio-style mitigation: damage scales with attack^2/(attack+defense), so
 * a strong defense meaningfully blunts an attack instead of only affecting
 * how damage splits across multiple defenders. */
function mitigatedDamage(attackPower: number, defensePower: number): number {
  if (attackPower <= 0) return 0;
  return (attackPower * attackPower) / (attackPower + defensePower);
}

/**
 * Single-round battle: the attacking unit and the defending stack damage each
 * other simultaneously (with mild randomness). Health is large relative to a
 * single hit, so most exchanges chip away rather than one-shot — clearing a
 * garrison typically takes more than one arriving unit, mirroring the source
 * game's need to mass forces before an assault. Reads attack/defense directly
 * from each Unit (baked in at build time, including any research bonus — see
 * ordersResolver.ts) rather than re-deriving from UNIT_TYPES.
 *
 * `defenseMultiplier` scales the defenders' effective defense — it carries
 * the terrain/fortification bonus from the province's defensive buildings
 * (Army Base, Bunkers, Combat Outpost — see ordersResolver.ts).
 */
export function resolveCombat(
  attacker: Unit,
  defenders: Unit[],
  rngSeed: number,
  defenseMultiplier = 1,
): CombatOutcome {
  const { value: v1, nextSeed: seed1 } = nextRandom(rngSeed);
  const { value: v2, nextSeed: seed2 } = nextRandom(seed1);

  const varianceAttack = VARIANCE_MIN + v1 * VARIANCE_SPREAD;
  const varianceDefense = VARIANCE_MIN + v2 * VARIANCE_SPREAD;

  const attackPower = attacker.attack * (attacker.health / 100) * varianceAttack;
  const totalDefensePower = defenders.reduce(
    (sum, d) => sum + d.defense * defenseMultiplier * (d.health / 100),
    0,
  );
  const damageToDefenderPool = mitigatedDamage(attackPower, totalDefensePower);

  const survivingDefenders = defenders
    .map((d) => {
      const weighted = d.defense * defenseMultiplier * (d.health / 100);
      const share = totalDefensePower > 0 ? weighted / totalDefensePower : 1 / defenders.length;
      const health = Math.max(0, d.health - damageToDefenderPool * share);
      return { ...d, health };
    })
    .filter((d) => d.health > 0);

  const totalDefenderAttackPower = defenders.reduce((sum, d) => sum + d.attack * (d.health / 100), 0);
  const attackerDefensePower = attacker.defense * (attacker.health / 100);
  const damageToAttacker =
    mitigatedDamage(totalDefenderAttackPower, attackerDefensePower) * varianceDefense;
  const attackerHealth = Math.max(0, attacker.health - damageToAttacker);

  return {
    attackerHealth,
    attackerSurvived: attackerHealth > 0,
    defenders: survivingDefenders,
    nextRngSeed: seed2,
  };
}
