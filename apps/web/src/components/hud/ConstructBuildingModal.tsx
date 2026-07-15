import { BUILDING_TYPES, type BuildingId } from '@con/engine'
import { HUMAN_COUNTRY_ID, useGameStore } from '../../state/gameStore'
import { BUILDING_LABELS_FR, formatCostFr } from '../../i18n/fr'
import { formatDuration } from '../../utils/formatDuration'
import { Modal } from './Modal'
import { BuildingIcon } from './icons'
import './hud.css'

function canAfford(resources: Record<string, number>, cost: Record<string, number | undefined>): boolean {
  return Object.entries(cost).every(([resource, amount]) => (resources[resource] ?? 0) >= (amount ?? 0))
}

export function ConstructBuildingModal({ provinceId, onClose }: { provinceId: string; onClose: () => void }) {
  const country = useGameStore((s) => s.state.countries[HUMAN_COUNTRY_ID])
  const province = useGameStore((s) => s.state.provinces[provinceId])
  const queueConstruct = useGameStore((s) => s.queueConstruct)

  if (!country || !province) return null

  return (
    <Modal title="Construire un bâtiment" onClose={onClose}>
      <div className="production-grid">
        {(Object.keys(BUILDING_TYPES) as BuildingId[]).map((buildingId) => {
          const def = BUILDING_TYPES[buildingId]
          const alreadyBuilt = province.buildings.includes(buildingId)
          const affordable = canAfford(country.resources, def.cost)
          return (
            <div key={buildingId} className="production-card">
              <div className="production-icon">
                <BuildingIcon id={buildingId} />
              </div>
              <div className="production-info">
                <h4>{BUILDING_LABELS_FR[buildingId]}</h4>
                <p className="production-time">Durée : {formatDuration(def.buildTimeMs)}</p>
                <p className="production-cost">{formatCostFr(def.cost)}</p>
              </div>
              <button
                type="button"
                disabled={alreadyBuilt || !affordable}
                onClick={() => queueConstruct(provinceId, buildingId)}
              >
                {alreadyBuilt ? 'Construit' : 'Construire'}
              </button>
            </div>
          )
        })}
      </div>
    </Modal>
  )
}
