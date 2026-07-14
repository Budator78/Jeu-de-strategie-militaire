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
