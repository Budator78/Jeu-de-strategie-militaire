import { GameClock } from './components/hud/GameClock'
import { GameOverModal } from './components/hud/GameOverModal'
import { ResearchPanel } from './components/hud/ResearchPanel'
import { ResourceBar } from './components/hud/ResourceBar'
import { SaveControls } from './components/hud/SaveControls'
import { MapView } from './components/map/MapView'
import { useGameLoop } from './hooks/useGameLoop'

function App() {
  useGameLoop()

  return (
    <main style={{ fontFamily: 'sans-serif', padding: '1.5rem' }}>
      <h1>Conflict of Nations — Like</h1>
      <ResourceBar />
      <GameClock />
      <SaveControls />
      <ResearchPanel />
      <MapView />
      <GameOverModal />
    </main>
  )
}

export default App
