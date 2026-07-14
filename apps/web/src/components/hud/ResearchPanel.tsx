import { MAX_CONCURRENT_RESEARCH, RESEARCH_TYPES, type ResearchId } from '@con/engine'
import { HUMAN_COUNTRY_ID, useGameStore } from '../../state/gameStore'
import './hud.css'

function canAfford(resources: Record<string, number>, cost: Record<string, number | undefined>): boolean {
  return Object.entries(cost).every(([resource, amount]) => (resources[resource] ?? 0) >= (amount ?? 0))
}

export function ResearchPanel() {
  const country = useGameStore((s) => s.state.countries[HUMAN_COUNTRY_ID])
  const pendingCount = useGameStore(
    (s) => s.state.pendingOrders.filter((o) => o.kind === 'research' && o.ownerId === HUMAN_COUNTRY_ID).length,
  )
  const queueResearch = useGameStore((s) => s.queueResearch)

  if (!country) return null

  return (
    <div className="unit-build-panel research-panel">
      <h3>
        Research ({pendingCount}/{MAX_CONCURRENT_RESEARCH} in progress)
      </h3>
      {(Object.keys(RESEARCH_TYPES) as ResearchId[]).map((researchId) => {
        const def = RESEARCH_TYPES[researchId]
        const completed = country.researchedIds.includes(researchId)
        const affordable = canAfford(country.resources, def.cost)
        const costText = Object.entries(def.cost)
          .map(([resource, amount]) => `${amount} ${resource}`)
          .join(', ')
        return (
          <button
            key={researchId}
            type="button"
            disabled={completed || !affordable || pendingCount >= MAX_CONCURRENT_RESEARCH}
            onClick={() => queueResearch(researchId)}
            title={costText}
          >
            {def.name} (+{Math.round(def.attackBonus * 100)}% atk/def) {completed ? '(done)' : `(${costText})`}
          </button>
        )
      })}
    </div>
  )
}
