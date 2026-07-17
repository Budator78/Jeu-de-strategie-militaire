import { ISO3_TO_ISO2 } from './iso3to2'

/**
 * Resolves a country's flag to a plain image URL for on-map troop counters,
 * which paint it with a cheap SVG <image> (hundreds of them — a foreignObject
 * per stack froze the map). Rather than glob node_modules (Vite won't traverse
 * outside its root), we read the URL straight from the flag-icons CSS that's
 * already loaded, so it works identically in dev and production builds.
 */
const cache = new Map<string, string | undefined>()

export function flagUrlFor(countryId: string): string | undefined {
  const iso2 = ISO3_TO_ISO2[countryId]
  if (!iso2) return undefined
  if (cache.has(iso2)) return cache.get(iso2)

  let url: string | undefined
  if (typeof document !== 'undefined') {
    const probe = document.createElement('span')
    probe.className = `fi fi-${iso2}`
    probe.style.position = 'absolute'
    probe.style.left = '-9999px'
    document.body.appendChild(probe)
    const bg = getComputedStyle(probe).backgroundImage
    document.body.removeChild(probe)
    const match = /url\(["']?(.*?)["']?\)/.exec(bg)
    url = match?.[1]
  }
  cache.set(iso2, url)
  return url
}
