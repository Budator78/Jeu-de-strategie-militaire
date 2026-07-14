import { AVAILABLE_TIME_SCALES, useGameStore } from '../../state/gameStore'
import './hud.css'

function formatClock(clockMs: number): string {
  const day = Math.floor(clockMs / 86_400_000) + 1
  const msOfDay = clockMs % 86_400_000
  const totalSeconds = Math.floor(msOfDay / 1000)
  const hh = String(Math.floor(totalSeconds / 3600)).padStart(2, '0')
  const mm = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0')
  const ss = String(totalSeconds % 60).padStart(2, '0')
  return `Day ${day}, ${hh}:${mm}:${ss}`
}

export function GameClock() {
  const clockMs = useGameStore((s) => s.state.clockMs)
  const paused = useGameStore((s) => s.paused)
  const setPaused = useGameStore((s) => s.setPaused)
  const timeScale = useGameStore((s) => s.timeScale)
  const setTimeScale = useGameStore((s) => s.setTimeScale)

  return (
    <div className="turn-controls">
      <span>{formatClock(clockMs)}</span>
      <button type="button" onClick={() => setPaused(!paused)}>
        {paused ? 'Resume' : 'Pause'}
      </button>
      <span className="speed-controls">
        Speed:
        {AVAILABLE_TIME_SCALES.map((scale) => (
          <button
            key={scale}
            type="button"
            className={scale === timeScale ? 'speed-active' : ''}
            onClick={() => setTimeScale(scale)}
          >
            {scale}x
          </button>
        ))}
      </span>
    </div>
  )
}
