import { MAX_CONCURRENT_RESEARCH, RESEARCH_TYPES, type ResearchId } from '@con/engine'
import { HUMAN_COUNTRY_ID, useGameStore } from '../../state/gameStore'
import { formatCostFr, RESEARCH_LABELS_FR } from '../../i18n/fr'
import { formatDuration } from '../../utils/formatDuration'
import { Modal } from './Modal'
import { ResearchIcon } from './icons'
import './hud.css'

function canAfford(resources: Record<string, number>, cost: Record<string, number | undefined>): boolean {
  return Object.entries(cost).every(([resource, amount]) => (resources[resource] ?? 0) >= (amount ?? 0))
}

export function ResearchModal({ onClose }: { onClose: () => void }) {
  const country = useGameStore((s) => s.state.countries[HUMAN_COUNTRY_ID])
  const pendingCount = useGameStore(
    (s) => s.state.pendingOrders.filter((o) => o.kind === 'research' && o.ownerId === HUMAN_COUNTRY_ID).length,
  )
  const queueResearch = useGameStore((s) => s.queueResearch)

  if (!country) return null

  return (
    <Modal title={`Recherche (${pendingCount}/${MAX_CONCURRENT_RESEARCH} en cours)`} onClose={onClose}>
      <p className="research-note">
        À l'échelle du pays — s'applique aux nouvelles unités partout, pas à une ville précise.
      </p>
      <div className="production-grid">
        {(Object.keys(RESEARCH_TYPES) as ResearchId[]).map((researchId) => {
          const def = RESEARCH_TYPES[researchId]
          const completed = country.researchedIds.includes(researchId)
          const affordable = canAfford(country.resources, def.cost)
          return (
            <div key={researchId} className="production-card">
              <div className="production-icon">
                <ResearchIcon />
              </div>
              <div className="production-info">
                <h4>{RESEARCH_LABELS_FR[researchId]}</h4>
                <p className="production-time">
                  Durée : {formatDuration(def.researchTimeMs)} · +{Math.round(def.attackBonus * 100)}% att/déf
                </p>
                <p className="production-cost">{formatCostFr(def.cost)}</p>
              </div>
              <button
                type="button"
                disabled={completed || !affordable || pendingCount >= MAX_CONCURRENT_RESEARCH}
                onClick={() => queueResearch(researchId)}
              >
                {completed ? 'Terminée' : 'Rechercher'}
              </button>
            </div>
          )
        })}
      </div>
    </Modal>
  )
}
