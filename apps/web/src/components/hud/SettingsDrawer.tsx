import { AVAILABLE_TIME_SCALES, useGameStore } from '../../state/gameStore'
import './hud.css'

/** Pause/speed/save controls, tucked behind the bottom-right gear like an options panel. */
export function SettingsDrawer({ onClose }: { onClose: () => void }) {
  const paused = useGameStore((s) => s.paused)
  const setPaused = useGameStore((s) => s.setPaused)
  const timeScale = useGameStore((s) => s.timeScale)
  const setTimeScale = useGameStore((s) => s.setTimeScale)
  const fogOfWar = useGameStore((s) => s.fogOfWar)
  const setFogOfWar = useGameStore((s) => s.setFogOfWar)
  const admin = useGameStore((s) => s.admin)
  const saveGame = useGameStore((s) => s.saveGame)
  const loadGame = useGameStore((s) => s.loadGame)
  const newGame = useGameStore((s) => s.newGame)
  const hasSave = useGameStore((s) => s.hasSave)

  return (
    <div className="settings-drawer">
      <div className="settings-header">
        <span>OPTIONS</span>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Fermer">
          ×
        </button>
      </div>
      <div className="settings-row">
        <button type="button" onClick={() => setPaused(!paused)}>
          {paused ? 'Reprendre' : 'Pause'}
        </button>
      </div>
      <div className="settings-row">
        <span className="settings-label">Vitesse</span>
        <span className="speed-controls">
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
      {admin && (
        <div className="settings-row">
          <label className="settings-toggle">
            <input type="checkbox" checked={fogOfWar} onChange={(e) => setFogOfWar(e.target.checked)} />
            <span>
              Brouillard de guerre <em className="settings-admin-tag">(option admin)</em>
            </span>
          </label>
        </div>
      )}
      <div className="settings-row">
        <button type="button" onClick={saveGame}>
          Sauvegarder
        </button>
        <button type="button" onClick={loadGame} disabled={!hasSave}>
          Charger
        </button>
        <button type="button" onClick={newGame}>
          Nouvelle partie
        </button>
      </div>
      <p className="settings-note">{hasSave ? 'Sauvegarde auto toutes les ~5 s' : 'Aucune sauvegarde'}</p>
    </div>
  )
}
