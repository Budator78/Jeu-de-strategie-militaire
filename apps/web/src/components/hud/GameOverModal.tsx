import { HUMAN_COUNTRY_ID, useGameStore } from '../../state/gameStore'
import './hud.css'

export function GameOverModal() {
  const status = useGameStore((s) => s.state.status)
  const winnerId = useGameStore((s) => s.state.winnerId)
  const winner = useGameStore((s) => (winnerId ? s.state.countries[winnerId] : null))
  const newGame = useGameStore((s) => s.newGame)

  if (status !== 'ended') return null

  const youWon = winnerId === HUMAN_COUNTRY_ID

  return (
    <div className="game-over-backdrop">
      <div className="game-over-modal">
        <h2>{winner ? `${winner.name} wins!` : 'Game over'}</h2>
        <p>{winner ? (youWon ? 'Victory! You conquered the map.' : 'Defeat — try again.') : 'No one is left standing.'}</p>
        <button type="button" onClick={newGame}>
          New Game
        </button>
      </div>
    </div>
  )
}
