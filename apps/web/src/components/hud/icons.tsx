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
    case 'nationalGuard':
      return (
        <svg viewBox="0 0 32 32" width={32} height={32} aria-hidden="true">
          <circle cx="16" cy="8" r="4" fill="currentColor" />
          <path d="M10 28 L12 16 Q16 13.5 20 16 L22 28 L18 28 L17 21 L15 21 L14 28 Z" fill="currentColor" />
          <path d="M22 6 h6 v5 q0 3 -3 4 q-3 -1 -3 -4 Z" fill="currentColor" />
        </svg>
      )
    case 'mechInfantry':
      return (
        <svg viewBox="0 0 32 32" width={32} height={32} aria-hidden="true">
          <circle cx="11" cy="7" r="3.4" fill="currentColor" />
          <path d="M6 24 L8 14 Q11 12 14 14 L16 24 Z" fill="currentColor" />
          <path d="M17 18 h11 l-3 6 h-8 Z" fill="currentColor" />
          <circle cx="20" cy="26" r="2.2" fill="currentColor" />
          <circle cx="25" cy="26" r="2.2" fill="currentColor" />
        </svg>
      )
    case 'recon':
      return (
        <svg viewBox="0 0 32 32" width={32} height={32} aria-hidden="true">
          <path d="M4 20 L8 14 h12 l4 6 h4 v4 H2 v-4 Z" fill="currentColor" />
          <rect x="11" y="10" width="6" height="5" fill="currentColor" />
          <circle cx="9" cy="26" r="2.6" fill="currentColor" />
          <circle cx="22" cy="26" r="2.6" fill="currentColor" />
        </svg>
      )
    case 'afv':
      return (
        <svg viewBox="0 0 32 32" width={32} height={32} aria-hidden="true">
          <path d="M4 18 L9 13 h14 l5 5 v5 H4 Z" fill="currentColor" />
          <rect x="13" y="8.5" width="7" height="6" rx="1" fill="currentColor" />
          <rect x="18" y="10" width="9" height="2" fill="currentColor" />
          <circle cx="9" cy="25" r="2.4" fill="currentColor" />
          <circle cx="16" cy="25" r="2.4" fill="currentColor" />
          <circle cx="23" cy="25" r="2.4" fill="currentColor" />
        </svg>
      )
    case 'gunship':
      return (
        <svg viewBox="0 0 32 32" width={32} height={32} aria-hidden="true">
          <line x1="4" y1="8" x2="28" y2="8" stroke="currentColor" strokeWidth="2" />
          <ellipse cx="15" cy="16" rx="8" ry="5" fill="currentColor" />
          <path d="M22 15 h7 l-2 4 h-5 Z" fill="currentColor" />
          <rect x="15" y="8" width="2" height="4" fill="currentColor" />
          <path d="M8 23 h12 v2 H8 Z" fill="currentColor" />
        </svg>
      )
    case 'attackHelicopter':
      return (
        <svg viewBox="0 0 32 32" width={32} height={32} aria-hidden="true">
          <line x1="3" y1="7" x2="27" y2="7" stroke="currentColor" strokeWidth="2" />
          <path d="M6 15 Q9 11 15 12 L26 13 L29 16 L26 18 L15 19 Q9 20 6 17 Z" fill="currentColor" />
          <rect x="14" y="7" width="2" height="5" fill="currentColor" />
          <path d="M8 19 l-2 5 h3 l2 -4 Z" fill="currentColor" />
          <rect x="10" y="20" width="9" height="2" fill="currentColor" />
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

/** Small monochrome HUD glyphs (original art). Sized via CSS on the parent. */
export function HudIcon({ name }: { name: string }) {
  switch (name) {
    case 'newspaper':
      return (
        <svg viewBox="0 0 20 20" width="100%" height="100%" aria-hidden="true">
          <rect x="2" y="4" width="13" height="13" rx="1" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <rect x="15" y="7" width="3" height="10" fill="currentColor" />
          <rect x="4.5" y="6.5" width="8" height="3" fill="currentColor" />
          <line x1="4.5" y1="12" x2="12.5" y2="12" stroke="currentColor" strokeWidth="1.3" />
          <line x1="4.5" y1="14.5" x2="12.5" y2="14.5" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      )
    case 'research':
      return (
        <svg viewBox="0 0 20 20" width="100%" height="100%" aria-hidden="true">
          <path d="M8 2.5 h4 v5 l4 8 a1.5 1.5 0 0 1 -1.4 2 H5.4 a1.5 1.5 0 0 1 -1.4 -2 l4 -8 Z" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M6 13 h8 l1.5 3 h-11 Z" fill="currentColor" />
        </svg>
      )
    case 'dove':
      return (
        <svg viewBox="0 0 20 20" width="100%" height="100%" aria-hidden="true">
          <path d="M3 12 Q7 10 9 7 Q10 9 13 9 L17 8 L14 11 Q11 15 5 14 L2 16 L4 13 Z" fill="currentColor" />
          <path d="M9 7 Q10 3 14 3 Q11 5 11 8 Z" fill="currentColor" />
        </svg>
      )
    case 'handshake':
      return (
        <svg viewBox="0 0 20 20" width="100%" height="100%" aria-hidden="true">
          <path d="M2 8 L6 6 L10 8 L14 6 L18 8 L14 13 L10 11 L6 13 Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <line x1="10" y1="8" x2="10" y2="11" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      )
    case 'alert':
      return (
        <svg viewBox="0 0 20 20" width="100%" height="100%" aria-hidden="true">
          <rect x="8.4" y="3" width="3.2" height="9" rx="1.4" fill="currentColor" />
          <circle cx="10" cy="16" r="1.8" fill="currentColor" />
        </svg>
      )
    case 'info':
      return (
        <svg viewBox="0 0 20 20" width="100%" height="100%" aria-hidden="true">
          <circle cx="10" cy="5" r="1.7" fill="currentColor" />
          <rect x="8.5" y="8" width="3" height="9" rx="1.2" fill="currentColor" />
        </svg>
      )
    case 'home':
      return (
        <svg viewBox="0 0 20 20" width="100%" height="100%" aria-hidden="true">
          <path d="M3 10 L10 3.5 L17 10" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M5.5 9.5 V16.5 H14.5 V9.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <rect x="8.5" y="12" width="3" height="4.5" fill="currentColor" />
        </svg>
      )
    case 'trophy':
      return (
        <svg viewBox="0 0 20 20" width="100%" height="100%" aria-hidden="true">
          <path d="M6 3 h8 v5 a4 4 0 0 1 -8 0 Z" fill="currentColor" />
          <path d="M6 4.5 H3.5 a3 3 0 0 0 3 3.5 M14 4.5 h2.5 a3 3 0 0 1 -3 3.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <rect x="8.7" y="11.5" width="2.6" height="3" fill="currentColor" />
          <rect x="6.5" y="14.5" width="7" height="2.2" rx="0.6" fill="currentColor" />
        </svg>
      )
    case 'laurel':
      return (
        <svg viewBox="0 0 20 20" width="100%" height="100%" aria-hidden="true">
          <path d="M5 4 Q3 9 6 14 Q8 16.5 10 17 Q12 16.5 14 14 Q17 9 15 4 Q14.5 8 13 11 Q11.8 13.3 10 14 Q8.2 13.3 7 11 Q5.5 8 5 4 Z" fill="currentColor" />
          <circle cx="10" cy="7" r="2.4" fill="currentColor" />
        </svg>
      )
    case 'clockDay':
      return (
        <svg viewBox="0 0 20 20" width="100%" height="100%" aria-hidden="true">
          <path d="M10 2 L12 6 H8 Z" fill="currentColor" />
          <circle cx="10" cy="12" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M10 9 v3.2 l2.3 1.4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      )
    case 'fullscreen':
      return (
        <svg viewBox="0 0 20 20" width="100%" height="100%" aria-hidden="true">
          <path d="M3 8 V3 h5 M12 3 h5 v5 M17 12 v5 h-5 M8 17 H3 v-5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      )
    case 'layers':
      return (
        <svg viewBox="0 0 20 20" width="100%" height="100%" aria-hidden="true">
          <ellipse cx="10" cy="5.5" rx="6.5" ry="2.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M3.5 5.5 v4.5 c0 1.4 2.9 2.6 6.5 2.6 s6.5 -1.2 6.5 -2.6 V5.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M3.5 10 v4.5 c0 1.4 2.9 2.6 6.5 2.6 s6.5 -1.2 6.5 -2.6 V10" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      )
    case 'magnifier':
      return (
        <svg viewBox="0 0 20 20" width="100%" height="100%" aria-hidden="true">
          <circle cx="8.5" cy="8.5" r="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <line x1="12.3" y1="12.3" x2="17" y2="17" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      )
    case 'gear':
      return (
        <svg viewBox="0 0 20 20" width="100%" height="100%" aria-hidden="true">
          <circle cx="10" cy="10" r="3" fill="none" stroke="currentColor" strokeWidth="1.7" />
          <g stroke="currentColor" strokeWidth="1.8">
            <line x1="10" y1="2.5" x2="10" y2="5.5" /><line x1="10" y1="14.5" x2="10" y2="17.5" />
            <line x1="2.5" y1="10" x2="5.5" y2="10" /><line x1="14.5" y1="10" x2="17.5" y2="10" />
            <line x1="4.7" y1="4.7" x2="6.8" y2="6.8" /><line x1="13.2" y1="13.2" x2="15.3" y2="15.3" />
            <line x1="15.3" y1="4.7" x2="13.2" y2="6.8" /><line x1="6.8" y1="13.2" x2="4.7" y2="15.3" />
          </g>
        </svg>
      )
    default:
      return null
  }
}

/** Original officer portrait silhouette for the top-right diamond badge. */
export function OfficerPortrait() {
  return (
    <svg viewBox="0 0 48 48" width="100%" height="100%" aria-hidden="true">
      <rect width="48" height="48" fill="#3a444d" />
      <path d="M10 15 Q10 8 18 7 L34 6 Q38 9 36 14 L35 17 Q30 14 24 15 Q14 16 13 22 Z" fill="#2a323a" />
      <circle cx="24" cy="22" r="8.5" fill="#b99a72" />
      <path d="M10 48 Q10 34 24 34 Q38 34 38 48 Z" fill="#4a5747" />
      <path d="M18 36 L24 40 L30 36 L30 48 L18 48 Z" fill="#3d4a3b" />
      <path d="M13 22 Q13 13 22 12 L35 11 Q37 14 35 17 L33 19 Q28 15 22 16 Q15 17 14 23 Z" fill="#37414a" />
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
