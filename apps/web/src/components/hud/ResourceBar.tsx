import { useMemo, useState } from 'react'
import { computeNetIncomePerMinute, type ResourceType } from '@con/engine'
import { HUMAN_COUNTRY_ID, useGameStore } from '../../state/gameStore'
import { RESOURCE_LABELS_FR } from '../../i18n/fr'
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
  const [marketOpen, setMarketOpen] = useState(false)
  if (!country) return null

  return (
    <div className="resource-bar-wrap">
      <div className="resource-bar">
        <span className="resource-cell resource-cell-menu" title="Ressources">
          <span className="resource-menu-icon">
            <ResourceIcon resource="supplies" />
          </span>
          <span className="resource-menu-caret">▾</span>
        </span>
        {BAR_RESOURCES.map((resource) => (
          <span key={resource} className="resource-cell" title={RESOURCE_LABELS_FR[resource]}>
            <ResourceIcon resource={resource} />
            <span className="resource-numbers">
              <span className="resource-amount">{formatAmount(country.resources[resource])}</span>
              <span className={`resource-rate ${rates[resource] < 0 ? 'negative' : ''}`}>
                {formatRate(rates[resource])}
              </span>
            </span>
          </span>
        ))}
        <span className="resource-cell gold-cell" title={RESOURCE_LABELS_FR.gold}>
          <ResourceIcon resource="gold" />
          <span className="resource-numbers">
            <span className="resource-amount">{formatAmount(country.gold)}</span>
          </span>
          <button type="button" className="gold-plus" title="Obtenir de l'or">
            +
          </button>
        </span>
      </div>
      <button type="button" className="market-tab" onClick={() => setMarketOpen(!marketOpen)}>
        {marketOpen ? '︽' : '︾'}&nbsp;&nbsp;{marketOpen ? 'MASQUER LE MARCHÉ' : 'AFFICHER LE MARCHÉ'}&nbsp;&nbsp;
        {marketOpen ? '︽' : '︾'}
      </button>
      {marketOpen && (
        <div className="market-panel">
          <div className="market-title">MARCHÉ</div>
          {BAR_RESOURCES.filter((r) => r !== 'money').map((resource) => (
            <div key={resource} className="market-row">
              <ResourceIcon resource={resource} />
              <span className="market-name">{RESOURCE_LABELS_FR[resource]}</span>
              <button type="button" disabled title="À venir">
                Acheter
              </button>
              <button type="button" disabled title="À venir">
                Vendre
              </button>
            </div>
          ))}
          <p className="market-note">Le marché sera disponible dans une prochaine version.</p>
        </div>
      )}
    </div>
  )
}
