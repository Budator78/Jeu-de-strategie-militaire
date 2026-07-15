import { useGameStore } from '../../state/gameStore'
import { ResourceIcon } from './icons'
import './hud.css'

/** Recurring "gold offer" countdown cycle, purely cosmetic for now. */
const GOLD_CYCLE_MS = 6 * 60 * 60 * 1000

export function GoldTimer() {
  const clockMs = useGameStore((s) => s.state.clockMs)
  const remaining = GOLD_CYCLE_MS - (clockMs % GOLD_CYCLE_MS)
  const totalSeconds = Math.floor(remaining / 1000)
  const mm = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0')
  const ss = String(totalSeconds % 60).padStart(2, '0')

  return (
    <div className="gold-timer" title="Offre d'or">
      <div className="gold-timer-diamond">
        <div className="gold-timer-icon">
          <ResourceIcon resource="gold" />
        </div>
      </div>
      <div className="gold-timer-clock">
        {mm}:{ss}
      </div>
    </div>
  )
}
