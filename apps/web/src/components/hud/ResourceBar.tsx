import { useMemo } from 'react'
import { computeNetIncomePerMinute, type ResourceType } from '@con/engine'
import { HUMAN_COUNTRY_ID, useGameStore } from '../../state/gameStore'
import { ResourceIcon } from './icons'
import './hud.css'

const BAR_RESOURCES: ResourceType[] = [
  'supplies',
  'components',
  'fuel',
  'electronics',
  'rareMaterials',
  'manpower',
  'money',
]

function formatAmount(amount: number): string {
  return Math.floor(amount).toLocaleString('en-US')
}

function formatRate(perMinute: number): string {
  const perHour = Math.round(perMinute * 60)
  return `${perHour >= 0 ? '+' : ''}${perHour.toLocaleString('en-US')} /h`
}

export function ResourceBar() {
  const state = useGameStore((s) => s.state)
  const country = state.countries[HUMAN_COUNTRY_ID]
  const rates = useMemo(() => computeNetIncomePerMinute(state, HUMAN_COUNTRY_ID), [state])
  if (!country) return null

  return (
    <div className="resource-bar">
      {BAR_RESOURCES.map((resource) => (
        <span key={resource} className="resource-cell" title={resource}>
          <ResourceIcon resource={resource} />
          <span className="resource-numbers">
            <span className="resource-amount">{formatAmount(country.resources[resource])}</span>
            <span className={`resource-rate ${rates[resource] < 0 ? 'negative' : ''}`}>
              {formatRate(rates[resource])}
            </span>
          </span>
        </span>
      ))}
      <span className="resource-cell gold-cell" title="gold">
        <ResourceIcon resource="gold" />
        <span className="resource-numbers">
          <span className="resource-amount">{formatAmount(country.gold)}</span>
        </span>
      </span>
    </div>
  )
}
