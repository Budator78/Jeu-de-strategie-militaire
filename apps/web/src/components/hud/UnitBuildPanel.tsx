import { UNIT_TYPES, type UnitTypeId } from '@con/engine'
import { HUMAN_COUNTRY_ID, useGameStore } from '../../state/gameStore'
import './hud.css'

function canAfford(resources: Record<string, number>, cost: Record<string, number | undefined>): boolean {
  return Object.entries(cost).every(([resource, amount]) => (resources[resource] ?? 0) >= (amount ?? 0))
}

export function UnitBuildPanel({ provinceId }: { provinceId: string }) {
  const country = useGameStore((s) => s.state.countries[HUMAN_COUNTRY_ID])
  const queueBuild = useGameStore((s) => s.queueBuild)

  if (!country) return null

  return (
    <div className="unit-build-panel">
      <h3>Build unit</h3>
      {(Object.keys(UNIT_TYPES) as UnitTypeId[]).map((typeId) => {
        const def = UNIT_TYPES[typeId]
        const affordable = canAfford(country.resources, def.cost)
        const costText = Object.entries(def.cost)
          .map(([resource, amount]) => `${amount} ${resource}`)
          .join(', ')
        return (
          <button
            key={typeId}
            type="button"
            disabled={!affordable}
            onClick={() => queueBuild(provinceId, typeId)}
            title={costText}
          >
            {def.name} ({costText})
          </button>
        )
      })}
    </div>
  )
}
