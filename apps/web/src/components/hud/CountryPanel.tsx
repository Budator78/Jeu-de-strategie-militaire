import { computeVictoryPoints } from '@con/engine'
import { HUMAN_COUNTRY_ID, useGameStore } from '../../state/gameStore'
import { HudIcon } from './icons'
import './hud.css'

const PLAYER_NAME = 'BUDATOR78'

function GermanyFlag() {
  return (
    <svg viewBox="0 0 36 24" width={52} height={34} aria-hidden="true">
      <rect width="36" height="8" fill="#1a1a1a" />
      <rect y="8" width="36" height="8" fill="#c0392b" />
      <rect y="16" width="36" height="8" fill="#e5b93c" />
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

export function CountryPanel({ onOpenResearch }: { onOpenResearch: () => void }) {
  const country = useGameStore((s) => s.state.countries[HUMAN_COUNTRY_ID])
  const clockMs = useGameStore((s) => s.state.clockMs)
  const vp = useGameStore((s) => computeVictoryPoints(s.state, HUMAN_COUNTRY_ID))
  const vpTarget = useGameStore((s) => s.state.config.victoryPointTarget)
  const pendingResearch = useGameStore(
    (s) => s.state.pendingOrders.filter((o) => o.kind === 'research' && o.ownerId === HUMAN_COUNTRY_ID).length,
  )
  const warCount = country?.atWarWith.length ?? 0
  if (!country) return null

  const { day, time } = formatDayTime(clockMs)

  return (
    <div className="country-panel">
      <div className="country-panel-header">
        <GermanyFlag />
        <div className="country-panel-titles">
          <div className="country-panel-player">{PLAYER_NAME}</div>
          <div className="country-panel-nation">{country.name.toUpperCase()}</div>
        </div>
        <button type="button" className="cp-square-btn" title="Informations">
          <HudIcon name="info" />
        </button>
        <button type="button" className="cp-square-btn" title="Accueil">
          <HudIcon name="home" />
        </button>
      </div>
      <div className="country-panel-stats">
        <div className="cp-daytime">
          <span className="cp-icon">
            <HudIcon name="clockDay" />
          </span>
          <div className="cp-daytime-rows">
            <div>
              <span className="cp-label">JOUR</span>
              <span className="cp-chip">{day}</span>
            </div>
            <div>
              <span className="cp-label">TEMPS</span>
              <span className="cp-chip">{time}</span>
            </div>
          </div>
        </div>
        <div className="cp-victory">
          <span className="cp-icon">
            <HudIcon name="trophy" />
          </span>
          <div className="cp-victory-text">
            <div className="cp-label">PROGRESSION DE LA VICTOIRE</div>
            <div className="cp-vp">
              {vp} / {vpTarget} VP
            </div>
          </div>
          <span className="cp-laurel">
            <HudIcon name="laurel" />
          </span>
        </div>
      </div>
      <div className="country-panel-actions">
        <button type="button" className="cp-action-btn" title="Journal">
          <HudIcon name="newspaper" />
          <span className="cp-badge cp-badge-blue">1</span>
        </button>
        <button type="button" className="cp-action-btn cp-action-active" title="Recherche" onClick={onOpenResearch}>
          <HudIcon name="research" />
          {pendingResearch > 0 && <span className="cp-badge cp-badge-red">{pendingResearch}</span>}
        </button>
        <button type="button" className="cp-action-btn" title="Diplomatie">
          <HudIcon name="dove" />
        </button>
        <button type="button" className="cp-action-btn" title="Accords">
          <HudIcon name="handshake" />
        </button>
        <button type="button" className="cp-action-btn" title="Alertes">
          <HudIcon name="alert" />
          {warCount > 0 && <span className="cp-badge cp-badge-red">{warCount}</span>}
        </button>
      </div>
    </div>
  )
}
