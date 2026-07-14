import { computeVictoryPoints } from '@con/engine'
import { HUMAN_COUNTRY_ID, useGameStore } from '../../state/gameStore'
import './hud.css'

function GermanyFlag() {
  return (
    <svg viewBox="0 0 30 18" width={44} height={26} aria-hidden="true">
      <rect width="30" height="6" fill="#1a1a1a" />
      <rect y="6" width="30" height="6" fill="#c0392b" />
      <rect y="12" width="30" height="6" fill="#e5b93c" />
    </svg>
  )
}

function formatDayTime(clockMs: number): { day: number; time: string } {
  const day = Math.floor(clockMs / 86_400_000) + 1
  const msOfDay = clockMs % 86_400_000
  const totalSeconds = Math.floor(msOfDay / 1000)
  const hh = String(Math.floor(totalSeconds / 3600)).padStart(2, '0')
  const mm = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0')
  return { day, time: `${hh}:${mm}` }
}

export function CountryPanel() {
  const country = useGameStore((s) => s.state.countries[HUMAN_COUNTRY_ID])
  const clockMs = useGameStore((s) => s.state.clockMs)
  const vp = useGameStore((s) => computeVictoryPoints(s.state, HUMAN_COUNTRY_ID))
  const vpTarget = useGameStore((s) => s.state.config.victoryPointTarget)
  if (!country) return null

  const { day, time } = formatDayTime(clockMs)

  return (
    <div className="country-panel">
      <div className="country-panel-header">
        <GermanyFlag />
        <div className="country-panel-name">{country.name.toUpperCase()}</div>
      </div>
      <div className="country-panel-stats">
        <div className="country-panel-row">
          <span className="label">DAY</span>
          <span className="value">{day}</span>
          <span className="label">TIME</span>
          <span className="value">{time}</span>
        </div>
        <div className="country-panel-row">
          <span className="label">VICTORY PROGRESS</span>
          <span className="value">
            {vp} / {vpTarget} VP
          </span>
        </div>
      </div>
    </div>
  )
}
