import { useState } from 'react'
import type { MarketOffer, ResourceType } from '@con/engine'
import { HUMAN_COUNTRY_ID, useGameStore } from '../../state/gameStore'
import { eventToArticle, RESOURCE_LABELS_FR } from '../../i18n/fr'
import { ResourceIcon } from './icons'
import './hud.css'

type MarketTab = 'best' | 'all' | 'mine'
type Tradeable = Exclude<ResourceType, 'money'>

/** Resource pairs shown side by side, selected by the category buttons on top. */
const CATEGORY_PAIRS: Tradeable[][] = [
  ['supplies', 'components'],
  ['fuel', 'electronics'],
  ['rareMaterials', 'manpower'],
]

function CartGlyph() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
      <path d="M2 4 h3 l2.2 9 h8.3 l2 -6.5 H6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <circle cx="8.5" cy="16.5" r="1.6" fill="currentColor" />
      <circle cx="14.5" cy="16.5" r="1.6" fill="currentColor" />
    </svg>
  )
}

function OfferRow({ offer, onTrade }: { offer: MarketOffer; onTrade: () => void }) {
  const isBuy = offer.direction === 'playerBuys'
  return (
    <div className="offer-row">
      <span className="offer-res-icon">
        <ResourceIcon resource={offer.resource} />
      </span>
      <span className={`offer-amount ${isBuy ? 'buy' : 'sell'}`}>
        {isBuy ? '+' : '−'}
        {offer.amount.toLocaleString('en-US')}
      </span>
      <span className="offer-price">@ {offer.pricePerUnit}</span>
      <span className="offer-currency">
        <ResourceIcon resource={offer.currency === 'gold' ? 'gold' : 'money'} />
      </span>
      <button type="button" className={`offer-cart ${isBuy ? 'buy' : 'sell'}`} onClick={onTrade} title={isBuy ? 'Acheter' : 'Vendre'}>
        <CartGlyph />
      </button>
    </div>
  )
}

function ResourceColumn({ resource }: { resource: Tradeable }) {
  const market = useGameStore((s) => s.state.market)
  const trade = useGameStore((s) => s.trade)
  const buys = market.filter((o) => o.resource === resource && o.direction === 'playerBuys')
  const sells = market.filter((o) => o.resource === resource && o.direction === 'playerSells')
  const label = RESOURCE_LABELS_FR[resource]

  return (
    <div className="market-column">
      <div className="market-col-header">Acheter {label}</div>
      {buys.map((offer) => (
        <OfferRow key={offer.id} offer={offer} onTrade={() => trade(offer.id)} />
      ))}
      <div className="market-col-header">Vendre {label}</div>
      {sells.map((offer) => (
        <OfferRow key={offer.id} offer={offer} onTrade={() => trade(offer.id)} />
      ))}
    </div>
  )
}

export function MarketModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<MarketTab>('best')
  const [category, setCategory] = useState(0)
  const events = useGameStore((s) => s.state.events)
  const countries = useGameStore((s) => s.state.countries)

  const myTrades = events.filter((e) => e.kind === 'marketTrade' && e.countryId === HUMAN_COUNTRY_ID)
  const countryName = (id: string | null) => (id ? (countries[id]?.name ?? id) : 'Territoire libre')

  return (
    <div className="market-modal">
      <div className="market-modal-header">
        <span className="market-modal-title">
          <span className="market-title-square" /> MARCHÉ
        </span>
        <button type="button" className="market-close" onClick={onClose} aria-label="Fermer">
          X
        </button>
      </div>
      <div className="market-tabs">
        <button type="button" className={tab === 'best' ? 'active' : ''} onClick={() => setTab('best')}>
          MEILLEURES OFFRES
        </button>
        <button type="button" className={tab === 'all' ? 'active' : ''} onClick={() => setTab('all')}>
          TOUTES LES OFFRES
        </button>
        <button type="button" className={tab === 'mine' ? 'active' : ''} onClick={() => setTab('mine')}>
          MES TRANSACTIONS
        </button>
      </div>
      <div className="market-body">
        {tab !== 'mine' && (
          <>
            <div className="market-categories">
              {CATEGORY_PAIRS.map((pair, index) => (
                <button
                  key={pair.join('-')}
                  type="button"
                  className={index === category ? 'active' : ''}
                  onClick={() => setCategory(index)}
                >
                  {pair.map((resource) => (
                    <span key={resource} className="market-cat-icon">
                      <ResourceIcon resource={resource} />
                    </span>
                  ))}
                </button>
              ))}
            </div>
            {tab === 'best' ? (
              <div className="market-columns">
                {CATEGORY_PAIRS[category].map((resource) => (
                  <ResourceColumn key={resource} resource={resource} />
                ))}
              </div>
            ) : (
              <div className="market-columns market-columns-all">
                {CATEGORY_PAIRS.flat().map((resource) => (
                  <ResourceColumn key={resource} resource={resource} />
                ))}
              </div>
            )}
            <div className="market-actions">
              <button type="button" className="market-add-buy" disabled title="À venir">
                <CartGlyph /> AJOUTER UNE OFFRE D'ACHAT
              </button>
              <button type="button" className="market-add-sell" disabled title="À venir">
                <CartGlyph /> AJOUTER UNE OFFRE DE VENTE
              </button>
            </div>
          </>
        )}
        {tab === 'mine' && (
          <div className="market-transactions">
            {myTrades.length === 0 && <p className="market-note">Aucune transaction pour l'instant.</p>}
            {[...myTrades].reverse().map((event, index) => (
              <p key={index} className="market-transaction-row">
                {eventToArticle(event, countryName).body}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
