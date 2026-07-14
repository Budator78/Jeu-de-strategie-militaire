import { AVAILABLE_TIME_SCALES, useGameStore } from '../../state/gameStore'
import './hud.css'

/** Pause/resume + speed selector. The day/time readout lives in CountryPanel, like the source game. */
export function GameClock() {
  const paused = useGameStore((s) => s.paused)
  const setPaused = useGameStore((s) => s.setPaused)
  const timeScale = useGameStore((s) => s.timeScale)
  const setTimeScale = useGameStore((s) => s.setTimeScale)

  return (
    <>
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
    </>
  )
}
