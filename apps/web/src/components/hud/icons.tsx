import type { UnitTypeId } from '@con/engine'

/** Small original glyph icons (not game assets) — simple silhouettes for each unit/building type. */

export function UnitIcon({ type }: { type: UnitTypeId }) {
  switch (type) {
    case 'infantry':
      return (
        <svg viewBox="0 0 32 32" width={32} height={32} aria-hidden="true">
          <circle cx="16" cy="8" r="4" fill="currentColor" />
          <path d="M9 28 L11 16 Q16 13 21 16 L23 28 L19 28 L18 20 L14 20 L13 28 Z" fill="currentColor" />
        </svg>
      )
    case 'tank':
      return (
        <svg viewBox="0 0 32 32" width={32} height={32} aria-hidden="true">
          <rect x="4" y="16" width="24" height="8" rx="2" fill="currentColor" />
          <rect x="10" y="10" width="12" height="7" rx="1.5" fill="currentColor" />
          <rect x="20" y="12" width="10" height="2.5" fill="currentColor" />
          <circle cx="9" cy="25" r="2.5" fill="currentColor" />
          <circle cx="16" cy="25" r="2.5" fill="currentColor" />
          <circle cx="23" cy="25" r="2.5" fill="currentColor" />
        </svg>
      )
    case 'fighter':
      return (
        <svg viewBox="0 0 32 32" width={32} height={32} aria-hidden="true">
          <path d="M16 4 L18 14 L28 18 L28 20 L18 18 L18 24 L22 27 L22 29 L16 27.5 L10 29 L10 27 L14 24 L14 18 L4 20 L4 18 L14 14 Z" fill="currentColor" />
        </svg>
      )
    default:
      return null
  }
}

export function BuildingIcon({ id }: { id: string }) {
  if (id === 'armsIndustry') {
    return (
      <svg viewBox="0 0 32 32" width={32} height={32} aria-hidden="true">
        <rect x="4" y="16" width="24" height="12" fill="currentColor" />
        <rect x="8" y="6" width="4" height="12" fill="currentColor" />
        <rect x="16" y="9" width="4" height="9" fill="currentColor" />
        <path d="M4 16 L11 10 L18 16 Z" fill="currentColor" />
      </svg>
    )
  }
  // recruitingOffice (and any future default)
  return (
    <svg viewBox="0 0 32 32" width={32} height={32} aria-hidden="true">
      <rect x="7" y="14" width="18" height="14" fill="currentColor" />
      <path d="M4 14 L16 5 L28 14 Z" fill="currentColor" />
      <rect x="19" y="2" width="1.5" height="10" fill="currentColor" />
      <path d="M20.5 2 L27 4.5 L20.5 7 Z" fill="currentColor" />
    </svg>
  )
}

export function ResearchIcon() {
  return (
    <svg viewBox="0 0 32 32" width={32} height={32} aria-hidden="true">
      <circle cx="14" cy="14" r="9" fill="none" stroke="currentColor" strokeWidth="3" />
      <line x1="20.5" y1="20.5" x2="28" y2="28" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  )
}

/** Small colored resource glyphs for the top HUD bar (original art, styled after the source game's silhouettes). */
export function ResourceIcon({ resource }: { resource: string }) {
  switch (resource) {
    case 'supplies': // ammo crate
      return (
        <svg viewBox="0 0 16 16" width={16} height={16} aria-hidden="true">
          <rect x="1" y="4" width="14" height="10" rx="1" fill="#7a8a4a" />
          <rect x="1" y="7.5" width="14" height="2" fill="#5a6836" />
          <rect x="6.5" y="2" width="3" height="3" fill="#5a6836" />
        </svg>
      )
    case 'components': // gear
      return (
        <svg viewBox="0 0 16 16" width={16} height={16} aria-hidden="true">
          <circle cx="8" cy="8" r="4.5" fill="#9aa4ad" />
          <circle cx="8" cy="8" r="1.8" fill="#39424a" />
          <rect x="7" y="0.5" width="2" height="3" fill="#9aa4ad" />
          <rect x="7" y="12.5" width="2" height="3" fill="#9aa4ad" />
          <rect x="0.5" y="7" width="3" height="2" fill="#9aa4ad" />
          <rect x="12.5" y="7" width="3" height="2" fill="#9aa4ad" />
        </svg>
      )
    case 'fuel': // jerrycan
      return (
        <svg viewBox="0 0 16 16" width={16} height={16} aria-hidden="true">
          <rect x="2.5" y="3" width="11" height="12" rx="1" fill="#b8452e" />
          <rect x="4" y="1" width="4" height="3" fill="#8f3421" />
          <path d="M4.5 6 L11.5 13 M11.5 6 L4.5 13" stroke="#8f3421" strokeWidth="1.4" />
        </svg>
      )
    case 'electronics': // chip
      return (
        <svg viewBox="0 0 16 16" width={16} height={16} aria-hidden="true">
          <rect x="3.5" y="3.5" width="9" height="9" rx="1" fill="#4f9e5c" />
          <rect x="6" y="6" width="4" height="4" fill="#2e6b39" />
          <g stroke="#4f9e5c" strokeWidth="1.2">
            <line x1="5.5" y1="0.5" x2="5.5" y2="3.5" /><line x1="10.5" y1="0.5" x2="10.5" y2="3.5" />
            <line x1="5.5" y1="12.5" x2="5.5" y2="15.5" /><line x1="10.5" y1="12.5" x2="10.5" y2="15.5" />
            <line x1="0.5" y1="5.5" x2="3.5" y2="5.5" /><line x1="0.5" y1="10.5" x2="3.5" y2="10.5" />
            <line x1="12.5" y1="5.5" x2="15.5" y2="5.5" /><line x1="12.5" y1="10.5" x2="15.5" y2="10.5" />
          </g>
        </svg>
      )
    case 'rareMaterials': // ore/gem
      return (
        <svg viewBox="0 0 16 16" width={16} height={16} aria-hidden="true">
          <path d="M8 1.5 L13.5 6 L8 14.5 L2.5 6 Z" fill="#7d6aa8" />
          <path d="M8 1.5 L8 14.5 M2.5 6 L13.5 6" stroke="#5c4b85" strokeWidth="1" />
        </svg>
      )
    case 'manpower': // soldier bust
      return (
        <svg viewBox="0 0 16 16" width={16} height={16} aria-hidden="true">
          <circle cx="8" cy="5" r="3" fill="#c8b27a" />
          <path d="M2.5 15 Q2.5 9.5 8 9.5 Q13.5 9.5 13.5 15 Z" fill="#c8b27a" />
        </svg>
      )
    case 'money': // banknote
      return (
        <svg viewBox="0 0 16 16" width={16} height={16} aria-hidden="true">
          <rect x="0.5" y="4" width="15" height="8" rx="1" fill="#5f9e6b" />
          <circle cx="8" cy="8" r="2.2" fill="#3d7047" />
        </svg>
      )
    case 'gold': // ingots
      return (
        <svg viewBox="0 0 16 16" width={16} height={16} aria-hidden="true">
          <path d="M2 13.5 L3.5 9.5 L7 9.5 L8.5 13.5 Z" fill="#d8a92c" />
          <path d="M7.5 13.5 L9 9.5 L12.5 9.5 L14 13.5 Z" fill="#e5bc4a" />
          <path d="M4.8 8.5 L6.3 4.5 L9.8 4.5 L11.3 8.5 Z" fill="#f0cd62" />
        </svg>
      )
    default:
      return null
  }
}
