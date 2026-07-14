import { BUILDING_TYPES, UNIT_TYPES, type BuildingId, type UnitTypeId } from '@con/engine'
import { HUMAN_COUNTRY_ID, useGameStore } from '../../state/gameStore'
import './hud.css'

function canAfford(resources: Record<string, number>, cost: Record<string, number | undefined>): boolean {
  return Object.entries(cost).every(([resource, amount]) => (resources[resource] ?? 0) >= (amount ?? 0))
}

function formatCost(cost: Record<string, number | undefined>): string {
  return Object.entries(cost)
    .map(([resource, amount]) => `${amount} ${resource}`)
    .join(', ')
}

export function UnitBuildPanel({ provinceId }: { provinceId: string }) {
  const country = useGameStore((s) => s.state.countries[HUMAN_COUNTRY_ID])
  const province = useGameStore((s) => s.state.provinces[provinceId])
  const queueBuild = useGameStore((s) => s.queueBuild)
  const queueConstruct = useGameStore((s) => s.queueConstruct)

  if (!country || !province) return null

  return (
    <div className="unit-build-panel">
      <h3>Build unit</h3>
      {(Object.keys(UNIT_TYPES) as UnitTypeId[]).map((typeId) => {
        const def = UNIT_TYPES[typeId]
        const affordable = canAfford(country.resources, def.cost)
        const costText = formatCost(def.cost)
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
      <h3>Construct building</h3>
      {(Object.keys(BUILDING_TYPES) as BuildingId[]).map((buildingId) => {
        const def = BUILDING_TYPES[buildingId]
        const alreadyBuilt = province.buildings.includes(buildingId)
        const affordable = canAfford(country.resources, def.cost)
        const costText = formatCost(def.cost)
        return (
          <button
            key={buildingId}
            type="button"
            disabled={alreadyBuilt || !affordable}
            onClick={() => queueConstruct(provinceId, buildingId)}
            title={costText}
          >
            {def.name} {alreadyBuilt ? '(built)' : `(${costText})`}
          </button>
        )
      })}
    </div>
  )
}
