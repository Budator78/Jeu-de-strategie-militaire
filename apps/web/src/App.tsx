import { GameClock } from './components/hud/GameClock'
import { ResourceBar } from './components/hud/ResourceBar'
import { MapView } from './components/map/MapView'
import { useGameLoop } from './hooks/useGameLoop'

function App() {
  useGameLoop()

  return (
    <main style={{ fontFamily: 'sans-serif', padding: '1.5rem' }}>
      <h1>Conflict of Nations — Like</h1>
      <ResourceBar />
      <GameClock />
      <MapView />
    </main>
  )
}

export default App
