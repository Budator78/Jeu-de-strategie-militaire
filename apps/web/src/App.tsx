import { useState } from 'react'
import { GameClock } from './components/hud/GameClock'
import { GameOverModal } from './components/hud/GameOverModal'
import { ResearchIcon } from './components/hud/icons'
import { ResearchModal } from './components/hud/ResearchModal'
import { ResourceBar } from './components/hud/ResourceBar'
import { SaveControls } from './components/hud/SaveControls'
import { MapView } from './components/map/MapView'
import { useGameLoop } from './hooks/useGameLoop'

function App() {
  useGameLoop()
  const [researchOpen, setResearchOpen] = useState(false)

  return (
    <main style={{ fontFamily: 'sans-serif', padding: '1.5rem' }}>
      <h1>Conflict of Nations — Like</h1>
      <ResourceBar />
      <GameClock />
      <div className="turn-controls">
        <button type="button" className="research-button" onClick={() => setResearchOpen(true)}>
          <ResearchIcon /> Research
        </button>
      </div>
      <SaveControls />
      <MapView />
      {researchOpen && <ResearchModal onClose={() => setResearchOpen(false)} />}
      <GameOverModal />
    </main>
  )
}

export default App
