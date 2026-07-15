import { useState } from 'react'
import { CountryPanel } from './components/hud/CountryPanel'
import { LeftEdgeTabs, RightEdgeTab } from './components/hud/EdgeTabs'
import { GameOverModal } from './components/hud/GameOverModal'
import { GoldTimer } from './components/hud/GoldTimer'
import { NewspaperModal } from './components/hud/NewspaperModal'
import { PortraitBadge } from './components/hud/PortraitBadge'
import { ResearchModal } from './components/hud/ResearchModal'
import { ResourceBar } from './components/hud/ResourceBar'
import { SettingsDrawer } from './components/hud/SettingsDrawer'
import { MapView } from './components/map/MapView'
import { useGameLoop } from './hooks/useGameLoop'

function App() {
  useGameLoop()
  const [researchOpen, setResearchOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [journalOpen, setJournalOpen] = useState(false)

  return (
    <div className="game-root">
      <MapView onOpenSettings={() => setSettingsOpen(true)} />
      <ResourceBar />
      <CountryPanel onOpenResearch={() => setResearchOpen(true)} onOpenJournal={() => setJournalOpen(true)} />
      <LeftEdgeTabs />
      <RightEdgeTab />
      <PortraitBadge />
      <GoldTimer />
      {settingsOpen && <SettingsDrawer onClose={() => setSettingsOpen(false)} />}
      {researchOpen && <ResearchModal onClose={() => setResearchOpen(false)} />}
      {journalOpen && <NewspaperModal onClose={() => setJournalOpen(false)} />}
      <GameOverModal />
    </div>
  )
}

export default App
