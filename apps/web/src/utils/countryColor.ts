/** Deterministic political-map color per country id (minimap, flags, rankings). */
export function countryColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0
  const hue = ((hash % 360) + 360) % 360
  return `hsl(${hue}, 48%, 52%)`
}

const CALLSIGN_FIRST = ['Iron', 'Ghost', 'Steel', 'Night', 'Red', 'Storm', 'Sand', 'Grey']
const CALLSIGN_SECOND = ['Fox', 'Hawk', 'Lion', 'Viper', 'Bear', 'Eagle', 'Cobra', 'Raven']

/** Deterministic fictional AI commander callsign, so every nation has a leader name. */
export function leaderCallsign(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 33 + id.charCodeAt(i)) | 0
  const a = CALLSIGN_FIRST[((hash % 8) + 8) % 8]
  const b = CALLSIGN_SECOND[(((hash >> 3) % 8) + 8) % 8]
  const num = (((hash >> 6) % 90) + 90) % 90 + 10
  return `${a}${b}_${num}`
}
