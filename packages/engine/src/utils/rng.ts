/**
 * Deterministic PRNG step (mulberry32), expressed as a pure seed -> (value, nextSeed)
 * transform (rather than a stateful closure) so the RNG state can live inside
 * GameState and combat stays reproducible across advanceTime calls.
 */
export function nextRandom(seed: number): { value: number; nextSeed: number } {
  const a = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, nextSeed: a };
}
