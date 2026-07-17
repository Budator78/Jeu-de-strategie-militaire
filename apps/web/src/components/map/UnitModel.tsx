import type { UnitTypeId } from '@con/engine'

/**
 * Colored, shaded 2D unit "models" shown on the map (original art — not game
 * assets), in a side-view profile that reads at ~30px. Returns a <g> of shapes
 * drawn in a 0..44 × 0..32 space; the caller's nested <svg> viewBox frames it.
 * Military olive/grey palette with a soft top-light and dark wheels.
 */

const OLIVE = '#7c8259'
const OLIVE_TOP = '#949a6f'
const OLIVE_DARK = '#5b6042'
const STEEL = '#787f85'
const STEEL_TOP = '#949aa0'
const STEEL_DARK = '#565c62'
const TIRE = '#26292d'
const HUB = '#565b60'
const GLASS = '#9db9c6'
const GUN = '#2f3329'
const OUTLINE = '#1e2119'

export function UnitModel({ type }: { type: UnitTypeId }) {
  return (
    <g stroke={OUTLINE} strokeWidth={0.8} strokeLinejoin="round" strokeLinecap="round">
      {shapesFor(type)}
    </g>
  )
}

function wheel(cx: number, cy: number, r: number) {
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill={TIRE} />
      <circle cx={cx} cy={cy} r={r * 0.42} fill={HUB} stroke="none" />
    </>
  )
}

function shapesFor(type: UnitTypeId) {
  switch (type) {
    // Motorized infantry — a cargo truck (the reference unit).
    case 'infantry':
      return (
        <>
          <rect x={5} y={12} width={20} height={10} rx={1.2} fill={STEEL} />
          <rect x={5} y={12} width={20} height={3} rx={1} fill={STEEL_TOP} stroke="none" />
          <path d="M25 22 V14 h5 l4 4 v4 Z" fill={STEEL_DARK} />
          <rect x={26} y={15} width={5} height={3.5} rx={0.5} fill={GLASS} />
          {wheel(12, 23, 3.4)}
          {wheel(30, 23, 3.4)}
        </>
      )
    // National guard — a standing soldier figure.
    case 'nationalGuard':
      return (
        <>
          <ellipse cx={22} cy={8} rx={3.4} ry={3} fill={OLIVE_TOP} />
          <path d="M22 5.4 a3.4 3 0 0 1 3.4 2.6 h-6.8 A3.4 3 0 0 1 22 5.4 Z" fill={OLIVE_DARK} stroke="none" />
          <path d="M17 26 L18.5 13 Q22 10.5 25.5 13 L27 26 L23.5 26 L22.5 18 L21.5 18 L20.5 26 Z" fill={OLIVE} />
          <rect x={24} y={12} width={9} height={1.8} rx={0.8} fill={GUN} transform="rotate(-8 24 12)" />
        </>
      )
    // Mechanized infantry — a tracked APC.
    case 'mechInfantry':
      return (
        <>
          <path d="M5 20 L8 13 H30 L34 20 Z" fill={OLIVE} />
          <path d="M8 13 H30 L28 11 H10 Z" fill={OLIVE_TOP} />
          <rect x={17} y={9} width={7} height={4} rx={0.8} fill={OLIVE_DARK} />
          <rect x={4} y={20} width={32} height={5} rx={2.5} fill={TIRE} />
          {wheel(9, 22.5, 1.7)}
          {wheel(16, 22.5, 1.7)}
          {wheel(24, 22.5, 1.7)}
          {wheel(31, 22.5, 1.7)}
        </>
      )
    // Recon — a light open jeep.
    case 'recon':
      return (
        <>
          <path d="M6 21 V16 h6 l2 -3 h9 l2 3 h6 v5 Z" fill={OLIVE} />
          <path d="M14 13 h9 l1.5 3 h-12 Z" fill={GLASS} />
          <rect x={6} y={16} width={6} height={2} fill={OLIVE_TOP} stroke="none" />
          {wheel(13, 22, 3)}
          {wheel(30, 22, 3)}
        </>
      )
    // Wheeled IFV with a turret & autocannon.
    case 'afv':
      return (
        <>
          <path d="M4 21 L8 15 H30 L36 21 Z" fill={OLIVE} />
          <path d="M8 15 H30 L27 12.5 H12 Z" fill={OLIVE_TOP} />
          <rect x={16} y={9} width={8} height={4} rx={1} fill={OLIVE_DARK} />
          <rect x={23} y={10} width={11} height={1.6} rx={0.6} fill={GUN} />
          {wheel(10, 22, 3)}
          {wheel(20, 22, 3)}
          {wheel(30, 22, 3)}
        </>
      )
    // Main battle tank — hull, tracks, turret, long gun.
    case 'tank':
      return (
        <>
          <rect x={4} y={19} width={34} height={5.5} rx={2.7} fill={TIRE} />
          {wheel(9, 21.7, 1.8)}
          {wheel(16, 21.7, 1.8)}
          {wheel(23, 21.7, 1.8)}
          {wheel(30, 21.7, 1.8)}
          <path d="M6 19 L9 14 H33 L36 19 Z" fill={OLIVE} />
          <path d="M15 14 Q21 10 28 14 Z" fill={OLIVE_TOP} />
          <path d="M16 14 Q21 10.5 27 14 Z" fill={OLIVE_DARK} />
          <rect x={26} y={11.5} width={16} height={1.8} rx={0.6} fill={GUN} />
        </>
      )
    // Gunship helicopter — side view with main + tail rotor.
    case 'gunship':
      return (
        <>
          <line x1={6} y1={9} x2={30} y2={9} stroke={OUTLINE} strokeWidth={1.4} />
          <ellipse cx={17} cy={16} rx={9} ry={5} fill={STEEL} />
          <ellipse cx={13} cy={14.5} rx={4} ry={2} fill={GLASS} stroke="none" />
          <path d="M25 15 L38 16 L38 18 L25 18 Z" fill={STEEL_DARK} />
          <line x1={36} y1={13} x2={40} y2={19} stroke={OUTLINE} strokeWidth={1.2} />
          <rect x={17} y={9} width={1.6} height={3} fill={STEEL_DARK} />
          <path d="M11 21 h13 v1.6 h-13 Z" fill={GUN} />
        </>
      )
    // Attack helicopter — sleeker, stub wings with pods.
    case 'attackHelicopter':
      return (
        <>
          <line x1={5} y1={8} x2={31} y2={8} stroke={OUTLINE} strokeWidth={1.4} />
          <path d="M8 17 Q12 12 19 13 L33 14.5 L37 17 L33 19 L19 19.5 Q12 20 8 17 Z" fill={STEEL} />
          <path d="M10 15.5 Q13 13 17 13.6 L17 16 Z" fill={GLASS} stroke="none" />
          <line x1={35} y1={12} x2={39} y2={18} stroke={OUTLINE} strokeWidth={1.1} />
          <rect x={17} y={8} width={1.6} height={4} fill={STEEL_DARK} />
          <path d="M14 19.5 l-2 3.5 h4 l1.5 -3 Z" fill={STEEL_DARK} />
          <rect x={12} y={21} width={9} height={1.8} rx={0.6} fill={GUN} />
        </>
      )
    // Air-superiority fighter — side profile jet.
    case 'fighter':
      return (
        <>
          <path d="M4 16 L28 14 L40 15 Q42 16 40 17 L28 18 L4 17 Z" fill={STEEL} />
          <path d="M4 16 L28 14 L28 15.4 L6 16 Z" fill={STEEL_TOP} stroke="none" />
          <path d="M16 16 L24 9 L27 9 L22 16 Z" fill={STEEL_DARK} />
          <path d="M14 17 L20 23 L23 23 L20 17 Z" fill={STEEL_DARK} />
          <path d="M6 16.2 L11 15.4 L11 16.8 L6 16.8 Z" fill={GLASS} stroke="none" />
          <ellipse cx={3.5} cy={16.3} rx={1.6} ry={1.4} fill={GUN} />
        </>
      )
    default:
      return null
  }
}
