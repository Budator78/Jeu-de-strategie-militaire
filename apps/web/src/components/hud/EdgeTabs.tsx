import { useState } from 'react'
import { HUMAN_COUNTRY_ID, useGameStore } from '../../state/gameStore'
import { CITY_SIZE } from '../../state/scenario'
import { BUILDING_LABELS_FR } from '../../i18n/fr'
import './hud.css'

type LeftDrawer = 'rens' | 'chat' | null

export function LeftEdgeTabs() {
  const [open, setOpen] = useState<LeftDrawer>(null)

  return (
    <>
      <div className="edge-tabs edge-tabs-left">
        <button type="button" className="edge-tab" onClick={() => setOpen(open === 'rens' ? null : 'rens')}>
          <span className="edge-arrows">{open === 'rens' ? '«' : '»'}</span>
          <span className="edge-label">RENS.</span>
          <span className="edge-arrows">{open === 'rens' ? '«' : '»'}</span>
        </button>
        <button type="button" className="edge-tab" onClick={() => setOpen(open === 'chat' ? null : 'chat')}>
          <span className="edge-arrows">{open === 'chat' ? '«' : '»'}</span>
          <span className="edge-label">CHAT</span>
          <span className="edge-arrows">{open === 'chat' ? '«' : '»'}</span>
        </button>
      </div>
      {open === 'rens' && (
        <div className="edge-drawer edge-drawer-left">
          <div className="edge-drawer-title">RENSEIGNEMENT</div>
          <p className="edge-drawer-empty">Aucun rapport de renseignement.</p>
        </div>
      )}
      {open === 'chat' && (
        <div className="edge-drawer edge-drawer-left">
          <div className="edge-drawer-title">CHAT</div>
          <p className="edge-drawer-empty">Partie solo — aucun autre joueur connecté.</p>
        </div>
      )}
    </>
  )
}

export function RightEdgeTab() {
  const [open, setOpen] = useState(false)
  const provinces = useGameStore((s) => s.state.provinces)
  const units = useGameStore((s) => s.state.units)

  const cities = Object.values(provinces).filter((p) => p.isCity && p.ownerId === HUMAN_COUNTRY_ID)

  return (
    <>
      <div className="edge-tabs edge-tabs-right">
        <button type="button" className="edge-tab" onClick={() => setOpen(!open)}>
          <span className="edge-arrows">{open ? '»' : '«'}</span>
          <span className="edge-label">VILLES</span>
          <span className="edge-arrows">{open ? '»' : '«'}</span>
        </button>
      </div>
      {open && (
        <div className="edge-drawer edge-drawer-right">
          <div className="edge-drawer-title">VOS VILLES</div>
          {cities.map((city) => {
            const garrison = Object.values(units).filter((u) => u.provinceId === city.id).length
            return (
              <div key={city.id} className="city-row">
                <span className="city-row-name">
                  {city.name}
                  {CITY_SIZE[city.id] !== undefined ? `(${CITY_SIZE[city.id]})` : ''}
                </span>
                <span className="city-row-detail">
                  {city.buildings.length > 0
                    ? city.buildings.map((b) => BUILDING_LABELS_FR[b]).join(', ')
                    : 'Aucun bâtiment'}
                  {' · '}
                  {garrison} unité{garrison > 1 ? 's' : ''}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
