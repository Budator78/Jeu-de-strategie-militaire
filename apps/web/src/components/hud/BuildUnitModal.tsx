import { UNIT_TYPES, type UnitTypeId } from '@con/engine'
import { HUMAN_COUNTRY_ID, useGameStore } from '../../state/gameStore'
import { formatDuration } from '../../utils/formatDuration'
import { Modal } from './Modal'
import { UnitIcon } from './icons'
import './hud.css'

function canAfford(resources: Record<string, number>, cost: Record<string, number | undefined>): boolean {
  return Object.entries(cost).every(([resource, amount]) => (resources[resource] ?? 0) >= (amount ?? 0))
}

export function BuildUnitModal({ provinceId, onClose }: { provinceId: string; onClose: () => void }) {
  const country = useGameStore((s) => s.state.countries[HUMAN_COUNTRY_ID])
  const queueBuild = useGameStore((s) => s.queueBuild)

  if (!country) return null

  return (
    <Modal title="Build unit" onClose={onClose}>
      <div className="production-grid">
        {(Object.keys(UNIT_TYPES) as UnitTypeId[]).map((typeId) => {
          const def = UNIT_TYPES[typeId]
          const affordable = canAfford(country.resources, def.cost)
          return (
            <div key={typeId} className="production-card">
              <div className="production-icon">
                <UnitIcon type={typeId} />
              </div>
              <div className="production-info">
                <h4>{def.name}</h4>
                <p className="production-time">Time: {formatDuration(def.buildTimeMs)}</p>
                <p className="production-cost">
                  {Object.entries(def.cost)
                    .map(([resource, amount]) => `${amount} ${resource}`)
                    .join(', ')}
                </p>
              </div>
              <button type="button" disabled={!affordable} onClick={() => queueBuild(provinceId, typeId)}>
                Build
              </button>
            </div>
          )
        })}
      </div>
    </Modal>
  )
}
