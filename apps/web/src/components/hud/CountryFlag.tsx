import { countryColor } from '../../utils/countryColor'
import { ISO3_TO_ISO2 } from '../../utils/iso3to2'
import './hud.css'

/**
 * Real national flag via the flag-icons library (MIT). Countries whose
 * Natural Earth code has no ISO-2 flag (tiny disputed territories) fall back
 * to their deterministic political-map color.
 */
export function CountryFlag({ id, className = '' }: { id: string; className?: string }) {
  const iso2 = ISO3_TO_ISO2[id]
  if (iso2) {
    return <span className={`fi fi-${iso2} country-flag ${className}`} title={id} />
  }
  return <span className={`country-flag country-flag-fallback ${className}`} style={{ background: countryColor(id) }} />
}
