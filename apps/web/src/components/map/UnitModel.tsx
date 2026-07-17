import type { UnitTypeId } from '@con/engine'

/**
 * Colored, shaded 2D unit "models" shown on the map (original art — not game
 * assets), drawn in a 3/4 front-right view (top + side faces lit differently)
 * like the reference. Returns a <g> of shapes in a 0..48 × 0..40 space; the
 * caller's nested <svg> viewBox frames it. Military olive/grey palette.
 */

const OLIVE = '#7c8259'
const OLIVE_TOP = '#9aa074'
const OLIVE_DARK = '#565b3e'
const STEEL = '#767c82'
const STEEL_TOP = '#969ca2'
const STEEL_DARK = '#50555a'
const TIRE = '#26292d'
const TIRE_TOP = '#3a3e43'
const HUB = '#585d62'
const GLASS = '#a6c0cc'
const GUN = '#2f3329'
const OUTLINE = '#191c15'

// 3/4 projection: "depth" (front→back) runs up-and-right by this vector.
const DX = 5
const DY = -3.4

/** A shaded 3/4 box: lit top face, base front face, darker right face. */
function Box({ x, y, w, h, base, top, side }: { x: number; y: number; w: number; h: number; base: string; top: string; side: string }) {
  return (
    <>
      <polygon points={`${x},${y} ${x + w},${y} ${x + w + DX},${y + DY} ${x + DX},${y + DY}`} fill={top} />
      <polygon points={`${x + w},${y} ${x + w},${y + h} ${x + w + DX},${y + h + DY} ${x + w + DX},${y + DY}`} fill={side} />
      <rect x={x} y={y} width={w} height={h} fill={base} />
    </>
  )
}

function Wheel({ cx, cy, r = 2.4 }: { cx: number; cy: number; r?: number }) {
  return (
    <>
      <ellipse cx={cx} cy={cy} rx={r} ry={r * 1.15} fill={TIRE} />
      <ellipse cx={cx} cy={cy - 0.3} rx={r} ry={r * 0.5} fill={TIRE_TOP} stroke="none" />
      <circle cx={cx} cy={cy} r={r * 0.4} fill={HUB} stroke="none" />
    </>
  )
}

export function UnitModel({ type }: { type: UnitTypeId }) {
  return (
    <g stroke={OUTLINE} strokeWidth={0.7} strokeLinejoin="round" strokeLinecap="round">
      {shapesFor(type)}
    </g>
  )
}

function shapesFor(type: UnitTypeId) {
  switch (type) {
    // Motorized infantry — a cargo truck (the reference unit), 3/4 view.
    case 'infantry':
      return (
        <>
          <Wheel cx={17} cy={27} />
          <Wheel cx={26} cy={27} />
          <Wheel cx={33} cy={26} />
          <Box x={13} y={13} w={15} h={11} base={STEEL} top={STEEL_TOP} side={STEEL_DARK} />
          <Box x={28} y={17} w={7} h={7} base={STEEL} top={STEEL_TOP} side={STEEL_DARK} />
          <polygon points="28.5,18 34,18 34,21 28.5,21" fill={GLASS} />
        </>
      )
    // National guard — a 3/4 standing soldier.
    case 'nationalGuard':
      return (
        <>
          <ellipse cx={24} cy={12} rx={4} ry={3.4} fill={OLIVE_TOP} />
          <path d="M20 12 a4 3.4 0 0 1 8 0 Z" fill={OLIVE_DARK} stroke="none" />
          <path d="M18 30 L20 17 Q24 14 28 17 L30 30 L25.5 30 L24.5 21 L23.5 21 L22.5 30 Z" fill={OLIVE} />
          <path d="M20 17 Q24 14.5 28 17 L27 18.5 Q24 16.5 21 18.5 Z" fill={OLIVE_TOP} stroke="none" />
          <rect x={26} y={15} width={12} height={2} rx={0.8} fill={GUN} transform="rotate(-10 26 16)" />
        </>
      )
    // Mechanized infantry — a tracked APC.
    case 'mechInfantry':
      return (
        <>
          <rect x={11} y={23} width={28} height={5} rx={2.5} fill={TIRE} />
          <rect x={11} y={23} width={28} height={1.6} rx={0.8} fill={TIRE_TOP} stroke="none" />
          {[15, 21, 27, 33].map((cx) => (
            <circle key={cx} cx={cx} cy={25.5} r={1.4} fill={HUB} stroke="none" />
          ))}
          <Box x={13} y={13} w={22} h={9} base={OLIVE} top={OLIVE_TOP} side={OLIVE_DARK} />
          <polygon points="35,13 40,9.6 40,18.6 35,22" fill={OLIVE_DARK} />
          <Box x={22} y={8} w={7} h={4} base={OLIVE} top={OLIVE_TOP} side={OLIVE_DARK} />
        </>
      )
    // Recon — a light open jeep.
    case 'recon':
      return (
        <>
          <Wheel cx={18} cy={26} />
          <Wheel cx={32} cy={25} />
          <Box x={14} y={17} w={17} h={6} base={OLIVE} top={OLIVE_TOP} side={OLIVE_DARK} />
          <polygon points="20,17 27,17 28,13 21,13" fill={OLIVE_DARK} />
          <rect x={21} y={13.5} width={7} height={3} fill={GLASS} transform="skewX(-12)" />
        </>
      )
    // Wheeled IFV with a turret & autocannon.
    case 'afv':
      return (
        <>
          <Wheel cx={16} cy={26} />
          <Wheel cx={25} cy={26} />
          <Wheel cx={34} cy={25} />
          <Box x={13} y={14} w={21} h={9} base={OLIVE} top={OLIVE_TOP} side={OLIVE_DARK} />
          <polygon points="34,14 39,10.6 39,19.6 34,23" fill={OLIVE_DARK} />
          <Box x={19} y={8} w={8} h={5} base={OLIVE} top={OLIVE_TOP} side={OLIVE_DARK} />
          <rect x={26} y={9.5} width={13} height={1.8} rx={0.6} fill={GUN} />
        </>
      )
    // Main battle tank — hull, tracks, turret, long gun.
    case 'tank':
      return (
        <>
          <rect x={9} y={22} width={30} height={5.5} rx={2.7} fill={TIRE} />
          <rect x={9} y={22} width={30} height={1.7} rx={0.8} fill={TIRE_TOP} stroke="none" />
          {[13, 19, 25, 31, 37].map((cx) => (
            <circle key={cx} cx={cx} cy={24.7} r={1.5} fill={HUB} stroke="none" />
          ))}
          <Box x={11} y={14} w={24} h={8} base={OLIVE} top={OLIVE_TOP} side={OLIVE_DARK} />
          <Box x={18} y={8} w={11} h={6} base={OLIVE} top={OLIVE_TOP} side={OLIVE_DARK} />
          <rect x={28} y={9.6} width={16} height={2} rx={0.6} fill={GUN} />
        </>
      )
    // Gunship helicopter — top-3/4 view, main rotor disc + tail.
    case 'gunship':
      return (
        <>
          <ellipse cx={20} cy={19} rx={11} ry={6} fill={STEEL} />
          <ellipse cx={20} cy={16.5} rx={9} ry={3.5} fill={STEEL_TOP} stroke="none" />
          <path d="M15 15 Q19 13 23 14 L22 17 Q18 16 16 17 Z" fill={GLASS} stroke="none" />
          <path d="M30 17 L42 18.5 L42 20.5 L30 21 Z" fill={STEEL_DARK} />
          <line x1={40} y1={15} x2={44} y2={22} stroke={OUTLINE} strokeWidth={1.2} />
          <ellipse cx={19} cy={13} rx={15} ry={2.4} fill="rgba(40,44,36,0.5)" stroke="none" />
          <rect x={18} y={12} width={2} height={2.5} fill={STEEL_DARK} />
        </>
      )
    // Attack helicopter — sleeker, stub wings with pods.
    case 'attackHelicopter':
      return (
        <>
          <path d="M11 20 Q16 14 24 15 L36 16.5 L41 19 L36 21.5 L24 22 Q16 23 11 20 Z" fill={STEEL} />
          <path d="M13 17.5 Q17 14.8 22 15.5 L22 18 Q17 17 14 18.5 Z" fill={GLASS} stroke="none" />
          <rect x={20} y={19.5} width={12} height={2} rx={0.5} fill={GUN} />
          <line x1={39} y1={14} x2={43} y2={22} stroke={OUTLINE} strokeWidth={1.1} />
          <ellipse cx={20} cy={13.5} rx={16} ry={2.2} fill="rgba(40,44,36,0.5)" stroke="none" />
          <rect x={19} y={12.5} width={2} height={2.5} fill={STEEL_DARK} />
        </>
      )
    // Air-superiority fighter — top-3/4 swept-wing jet.
    case 'fighter':
      return (
        <>
          <path d="M8 20 L34 16 L43 18 Q45 19 43 20 L34 22 L8 21 Z" fill={STEEL} />
          <path d="M8 20 L34 16 L34 17.6 L10 20 Z" fill={STEEL_TOP} stroke="none" />
          <path d="M18 19 L26 10 L30 10 L24 19 Z" fill={STEEL_DARK} />
          <path d="M16 20 L23 28 L27 28 L22 20 Z" fill={STEEL_DARK} />
          <path d="M32 18 L37 14 L39 14 L36 18.4 Z" fill={STEEL_DARK} />
          <path d="M11 19.6 L17 18.8 L17 20.2 L11 20.4 Z" fill={GLASS} stroke="none" />
        </>
      )
    default:
      return null
  }
}
