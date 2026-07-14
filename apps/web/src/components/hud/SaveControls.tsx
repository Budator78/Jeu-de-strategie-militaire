import { useGameStore } from '../../state/gameStore'
import './hud.css'

export function SaveControls() {
  const saveGame = useGameStore((s) => s.saveGame)
  const loadGame = useGameStore((s) => s.loadGame)
  const newGame = useGameStore((s) => s.newGame)
  const hasSave = useGameStore((s) => s.hasSave)

  return (
    <>
      <button type="button" onClick={saveGame}>
        Save
      </button>
      <button type="button" onClick={loadGame} disabled={!hasSave}>
        Load
      </button>
      <button type="button" onClick={newGame}>
        New Game
      </button>
      <span style={{ fontSize: '0.72rem' }}>{hasSave ? 'Autosaves every ~5s' : 'No save yet'}</span>
    </>
  )
}
