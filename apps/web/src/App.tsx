import { useState } from 'react'
import { CountryPanel } from './components/hud/CountryPanel'
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
    <main
      style={{
        fontFamily: "'Segoe UI', sans-serif",
        padding: '0.6rem 0.8rem',
        background: '#242e37',
        color: '#dfe7ea',
        minHeight: '100vh',
        boxSizing: 'border-box',
      }}
    >
      <ResourceBar />
      <CountryPanel />
      <div className="turn-controls">
        <GameClock />
        <button type="button" className="research-button" onClick={() => setResearchOpen(true)}>
          <ResearchIcon /> Research
        </button>
        <SaveControls />
      </div>
      <MapView />
      {researchOpen && <ResearchModal onClose={() => setResearchOpen(false)} />}
      <GameOverModal />
    </main>
  )
}

export default App
