import { UNIT_TYPES, type UnitTypeId } from '@con/engine'
import { HUMAN_COUNTRY_ID, useGameStore } from '../../state/gameStore'
import { formatCostFr, UNIT_LABELS_FR } from '../../i18n/fr'
import { formatDuration } from '../../utils/formatDuration'
import { Modal } from './Modal'
import { UnitIcon } from './icons'
import './hud.css'

function canAfford(resources: Record<string, number>, cost: Record<string, number | undefined>): boolean {
  return Object.entries(cost).every(([resource, amount]) => (resources[resource] ?? 0) >= (amount ?? 0))
}

export function BuildUnitModal({ provinceId, onClose }: { provinceId: string; onClose: () => void }) {
  const country = useGameStore((s) => s.state.countries[HUMAN_COUNTRY_ID])
  const province = useGameStore((s) => s.state.provinces[provinceId])
  const queueBuild = useGameStore((s) => s.queueBuild)

  if (!country || !province) return null

  const hasAirBase = province.buildings.includes('airBase')

  return (
    <Modal title="Recruter une unité" onClose={onClose}>
      <div className="production-grid">
        {(Object.keys(UNIT_TYPES) as UnitTypeId[]).map((typeId) => {
          const def = UNIT_TYPES[typeId]
          const needsAirBase = def.domain === 'air' && !hasAirBase
          const affordable = canAfford(country.resources, def.cost)
          return (
            <div key={typeId} className="production-card">
              <div className="production-icon">
                <UnitIcon type={typeId} />
              </div>
              <div className="production-info">
                <h4>{UNIT_LABELS_FR[typeId]}</h4>
                {needsAirBase && <p className="production-locked">Nécessite une base aérienne</p>}
                <p className="production-time">Durée : {formatDuration(def.buildTimeMs)}</p>
                <p className="production-cost">{formatCostFr(def.cost)}</p>
              </div>
              <button
                type="button"
                disabled={!affordable || needsAirBase}
                onClick={() => queueBuild(provinceId, typeId)}
              >
                Recruter
              </button>
            </div>
          )
        })}
      </div>
    </Modal>
  )
}
