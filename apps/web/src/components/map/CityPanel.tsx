import { useMemo, useState } from 'react'
import {
  CITY_HEAL_PER_DAY,
  MORALE_BOOST_AMOUNT,
  MORALE_BOOST_GOLD_COST,
  provinceYieldMultiplier,
  type Province,
  type ResourceType,
} from '@con/engine'
import { HUMAN_COUNTRY_ID, useGameStore } from '../../state/gameStore'
import { CITY_SIZE } from '../../state/scenario'
import { RESOURCE_LABELS_FR, UNIT_LABELS_FR } from '../../i18n/fr'
import { BuildUnitModal } from '../hud/BuildUnitModal'
import { ConstructBuildingModal } from '../hud/ConstructBuildingModal'
import { BuildingIcon, ResourceIcon } from '../hud/icons'
import './MapView.css'

/** Original skyline placeholder standing in for the city photograph. */
function CityPhoto() {
  return (
    <svg viewBox="0 0 120 54" width="100%" height="100%" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <rect width="120" height="54" fill="#26313a" />
      <rect x="6" y="22" width="14" height="32" fill="#39434d" />
      <rect x="24" y="12" width="10" height="42" fill="#434e59" />
      <rect x="38" y="26" width="16" height="28" fill="#39434d" />
      <rect x="58" y="8" width="12" height="46" fill="#4a5661" />
      <rect x="74" y="18" width="14" height="36" fill="#39434d" />
      <rect x="92" y="28" width="10" height="26" fill="#434e59" />
      <rect x="106" y="16" width="9" height="38" fill="#39434d" />
      <g fill="#c8d24f" opacity="0.55">
        <rect x="27" y="16" width="2" height="2" /><rect x="31" y="22" width="2" height="2" />
        <rect x="61" y="12" width="2" height="2" /><rect x="65" y="20" width="2" height="2" />
        <rect x="77" y="24" width="2" height="2" /><rect x="83" y="32" width="2" height="2" />
        <rect x="9" y="28" width="2" height="2" /><rect x="15" y="36" width="2" height="2" />
      </g>
    </svg>
  )
}

function SmileyGlyph() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
      <circle cx="10" cy="10" r="8" fill="#e5b93c" />
      <circle cx="7" cy="8" r="1.2" fill="#4a3a10" />
      <circle cx="13" cy="8" r="1.2" fill="#4a3a10" />
      <path d="M6.5 12.5 Q10 15.5 13.5 12.5" fill="none" stroke="#4a3a10" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

export function CityPanel({
  province,
  fogged,
  onClose,
  onSelectProvince,
}: {
  province: Province
  fogged: boolean
  onClose: () => void
  onSelectProvince: (id: string) => void
}) {
  const countries = useGameStore((s) => s.state.countries)
  const provinces = useGameStore((s) => s.state.provinces)
  const units = useGameStore((s) => s.state.units)
  const boostMorale = useGameStore((s) => s.boostMorale)
  const humanGold = useGameStore((s) => s.state.countries[HUMAN_COUNTRY_ID]?.gold ?? 0)
  const [buildUnitOpen, setBuildUnitOpen] = useState(false)
  const [constructOpen, setConstructOpen] = useState(false)

  const owner = province.ownerId ? countries[province.ownerId] : null
  const isHomeCity = province.ownerId === HUMAN_COUNTRY_ID
  const isOccupied = province.ownerId !== province.homelandOf
  const morale = Math.round(province.morale)
  const canBoost = isHomeCity && morale < 100 && humanGold >= MORALE_BOOST_GOLD_COST

  const humanCities = useMemo(
    () => Object.values(provinces).filter((p) => p.isCity && p.ownerId === HUMAN_COUNTRY_ID).map((p) => p.id),
    [provinces],
  )
  const cityIndex = humanCities.indexOf(province.id)

  function cycleCity(delta: number) {
    if (humanCities.length === 0) return
    const next = (cityIndex + delta + humanCities.length) % humanCities.length
    onSelectProvince(humanCities[next])
  }

  // Top three effective daily yields (per-minute rate × morale/occupation × 24h).
  const yieldMultiplier = provinceYieldMultiplier(province)
  const dailyProduction = Object.entries(province.resources)
    .map(([resource, perMin]) => ({
      resource: resource as ResourceType,
      perDay: Math.round((perMin ?? 0) * yieldMultiplier * 1440),
    }))
    .sort((a, b) => b.perDay - a.perDay)
    .slice(0, 3)

  const garrison = Object.values(units).filter((u) => u.provinceId === province.id)

  return (
    <div className="city-panel">
      <div className="city-panel-header">
        <span className="city-panel-title">
          <strong>{province.name.toUpperCase()}</strong>&nbsp;({owner?.name ?? 'Territoire libre'})
        </span>
        <span className="city-panel-kind">
          {isHomeCity ? (isOccupied ? 'Ville occupée' : 'Patrie Ville') : 'Ville'}
        </span>
        <button type="button" className="market-close" onClick={onClose} aria-label="Fermer">
          X
        </button>
      </div>
      <div className="city-panel-body">
        {isHomeCity && cityIndex >= 0 && (
          <button type="button" className="city-arrow city-arrow-left" onClick={() => cycleCity(-1)} title="Ville précédente">
            ◄
          </button>
        )}
        <div className="city-block city-block-photo">
          <div className="city-photo">
            <CityPhoto />
          </div>
          <div className="city-subhead">PRODUCTION QUOTID.</div>
          <div className="city-production">
            {dailyProduction.map(({ resource, perDay }) => (
              <span key={resource} title={RESOURCE_LABELS_FR[resource]}>
                <ResourceIcon resource={resource} /> +{perDay.toLocaleString('en-US')}
              </span>
            ))}
          </div>
          <div className="city-subhead">MORAL</div>
          <div className="city-morale">
            <div className="city-morale-bar">
              <div
                className={`city-morale-fill ${morale < 35 ? 'low' : ''}`}
                style={{ width: `${morale}%` }}
              />
            </div>
            <span className="city-morale-value">{morale} %</span>
            <button
              type="button"
              className="city-morale-boost"
              disabled={!canBoost}
              onClick={() => boostMorale(province.id)}
              title={
                isHomeCity
                  ? `+${MORALE_BOOST_AMOUNT} moral pour ${MORALE_BOOST_GOLD_COST} or`
                  : 'Réservé au propriétaire'
              }
            >
              <SmileyGlyph />
            </button>
          </div>
        </div>
        <div className="city-block city-block-info">
          <div className="city-subhead">INFORMATIONS</div>
          <div className="city-info-row">
            <span className="city-info-label">Population</span>
            <span className="city-info-value">{CITY_SIZE[province.id] ?? '—'}</span>
          </div>
          <div className="city-info-row">
            <span className="city-info-label">Points de victoire</span>
            <span className="city-info-value">{province.victoryPoints}</span>
          </div>
          <div className="city-info-row">
            <span className="city-info-label">Valeur de guérison</span>
            <span className="city-info-value">{CITY_HEAL_PER_DAY} pv/jour</span>
          </div>
          <div className="city-info-row">
            <span className="city-info-label">Bonus défensif</span>
            <span className="city-info-value">0.00%</span>
          </div>
          {fogged ? (
            <div className="city-garrison">
              <div className="city-garrison-row">Garnison inconnue — hors de portée de vos renseignements.</div>
            </div>
          ) : (
            garrison.length > 0 && (
              <div className="city-garrison">
                {garrison.slice(0, 4).map((u) => (
                  <div key={u.id} className="city-garrison-row">
                    {UNIT_LABELS_FR[u.type]} — {Math.round(u.health)} pv
                  </div>
                ))}
                {garrison.length > 4 && <div className="city-garrison-row">… et {garrison.length - 4} de plus</div>}
              </div>
            )
          )}
        </div>
        <div className="city-block city-block-buildings">
          <div className="city-subhead">BÂTIMENTS</div>
          <div className="city-building-slots">
            {province.buildings.map((buildingId) => (
              <div key={buildingId} className="city-building-slot filled" title={buildingId}>
                <BuildingIcon id={buildingId} />
                <span className="city-building-level">1</span>
              </div>
            ))}
            {Array.from({ length: Math.max(0, 3 - province.buildings.length) }).map((_, i) => (
              <div key={i} className="city-building-slot empty">
                +
              </div>
            ))}
          </div>
        </div>
        {isHomeCity && (
          <div className="city-block city-block-actions">
            <div className="city-action-col">
              <div className="city-subhead">CONSTRUCTION</div>
              <button type="button" className="city-plus" onClick={() => setConstructOpen(true)} title="Construire un bâtiment">
                +
              </button>
            </div>
            <div className="city-action-col">
              <div className="city-subhead">MOBILISATION</div>
              <button
                type="button"
                className="city-plus"
                disabled={isOccupied}
                onClick={() => setBuildUnitOpen(true)}
                title={isOccupied ? 'Ville occupée — mobilisation impossible' : 'Recruter une unité'}
              >
                +
              </button>
              {isOccupied && <div className="city-side-note">Ville occupée</div>}
            </div>
            <div className="city-action-col city-action-side">
              <div className="city-side-note">0 agent</div>
              <div className="city-side-note">Point de rassemblement</div>
            </div>
          </div>
        )}
        {isHomeCity && cityIndex >= 0 && (
          <button type="button" className="city-arrow city-arrow-right" onClick={() => cycleCity(1)} title="Ville suivante">
            ►
          </button>
        )}
      </div>
      {buildUnitOpen && <BuildUnitModal provinceId={province.id} onClose={() => setBuildUnitOpen(false)} />}
      {constructOpen && <ConstructBuildingModal provinceId={province.id} onClose={() => setConstructOpen(false)} />}
    </div>
  )
}
