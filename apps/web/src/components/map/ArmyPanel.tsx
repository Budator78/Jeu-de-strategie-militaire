import { useMemo } from 'react'
import { UNIT_TYPES, type Unit, type UnitTypeId } from '@con/engine'
import { useGameStore } from '../../state/gameStore'
import { UNIT_LABELS_FR } from '../../i18n/fr'
import { UnitIcon } from '../hud/icons'
import './MapView.css'

/** Original army photograph placeholder — a field gun at dusk. */
function ArmyPhoto() {
  return (
    <svg viewBox="0 0 120 54" width="100%" height="100%" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <rect width="120" height="54" fill="#2e3a42" />
      <rect y="38" width="120" height="16" fill="#232c31" />
      <circle cx="97" cy="12" r="7" fill="#4d5a63" />
      <g fill="#151b1f">
        <rect x="22" y="34" width="30" height="4" rx="1.5" />
        <circle cx="30" cy="40" r="4.5" />
        <circle cx="46" cy="40" r="4.5" />
        <path d="M46 34 L84 20 L87 23 L52 37 Z" />
        <path d="M24 36 L10 44 L14 46 L30 39 Z" />
        <path d="M50 36 L66 45 L70 43 L56 37 Z" />
      </g>
    </svg>
  )
}

const DIVISION_LABELS: Array<{ types: UnitTypeId[]; label: string }> = [
  { types: ['infantry', 'nationalGuard', 'mechInfantry'], label: "Division d'infanterie" },
  { types: ['tank', 'afv', 'recon'], label: 'Division blindée' },
  { types: ['gunship', 'attackHelicopter'], label: "Division d'hélicoptères" },
  { types: ['fighter'], label: 'Division aérienne' },
]

function divisionLabel(units: Unit[]): string {
  const counts = DIVISION_LABELS.map(
    ({ types, label }) => [label, units.filter((u) => types.includes(u.type)).length] as const,
  )
  counts.sort((a, b) => b[1] - a[1])
  return counts[0][1] > 0 ? counts[0][0] : 'Division mixte'
}

export function ArmyPanel({
  units,
  provinceId,
  stackIndex,
  onClose,
  onCycle,
}: {
  units: Unit[]
  provinceId: string
  stackIndex: number
  onClose: () => void
  onCycle: (delta: number) => void
}) {
  const provinces = useGameStore((s) => s.state.provinces)
  const countries = useGameStore((s) => s.state.countries)
  const pendingOrders = useGameStore((s) => s.state.pendingOrders)
  const stopUnit = useGameStore((s) => s.stopUnit)

  const ownerName = countries[units[0]?.ownerId]?.name ?? '?'
  const currentProvince = provinces[provinceId]

  const byType = useMemo(() => {
    const groups = new Map<UnitTypeId, Unit[]>()
    for (const unit of units) {
      const list = groups.get(unit.type) ?? []
      list.push(unit)
      groups.set(unit.type, list)
    }
    return [...groups.entries()]
  }, [units])

  const totalAttack = units.reduce((sum, u) => sum + u.attack, 0)
  const totalDefense = units.reduce((sum, u) => sum + u.defense, 0)
  const totalHp = units.reduce((sum, u) => sum + u.health, 0)
  const maxHp = units.length * 100
  const slowestMoveMs = Math.max(...units.map((u) => UNIT_TYPES[u.type].moveTimeMs))
  const armySpeed = (60_000 / slowestMoveMs).toFixed(2)

  const unitIds = useMemo(() => new Set(units.map((u) => u.id)), [units])
  const activeMove = pendingOrders.find((o) => o.kind === 'move' && unitIds.has(o.unitId))
  const destinationId =
    activeMove && activeMove.kind === 'move'
      ? [activeMove.toProvinceId, ...(activeMove.remainingPath ?? [])].at(-1)
      : null
  const destinationName = destinationId ? (provinces[destinationId]?.name ?? destinationId) : null

  const ordinal = stackIndex === 0 ? '1re' : `${stackIndex + 1}e`

  return (
    <div className="army-panel-wrap">
      <div className="army-actions">
        <button type="button" className="army-action army-action-move active" title="Cliquez une destination sur la carte">
          <span className="army-action-icon">»</span>
          Déplacer
        </button>
        <button type="button" className="army-action army-action-attack active" title="Cliquez une cible sur la carte">
          <span className="army-action-icon">✛</span>
          Attaquer
        </button>
        <button type="button" className="army-action army-action-load" disabled title="Embarquement — à venir">
          <span className="army-action-icon">⬆</span>
          Chargement
        </button>
        <button type="button" className="army-action" disabled title="Contrôle de tir — à venir">
          <span className="army-action-icon">⚡</span>
          Contrôle de tir
        </button>
        <button type="button" className="army-action" disabled title="Séparer la pile — à venir">
          <span className="army-action-icon">⤤</span>
          Séparer
        </button>
      </div>
      <div className="army-panel">
        <div className="army-panel-header">
          <span className="army-panel-title">
            <strong>
              {ordinal} / {divisionLabel(units)}
            </strong>
            &nbsp;({ownerName}) <span className="army-u">U {units.length}</span>
          </span>
          <button type="button" className="market-close" onClick={onClose} aria-label="Fermer">
            X
          </button>
        </div>
        <div className="army-panel-body">
          <button type="button" className="city-arrow city-arrow-left" onClick={() => onCycle(-1)} title="Armée précédente">
            ◄
          </button>
          <div className="army-block army-block-photo">
            <div className="city-photo">
              <ArmyPhoto />
            </div>
            <div className="army-hp">
              <div className="army-hp-bar">
                <div className="army-hp-fill" style={{ width: `${(totalHp / maxHp) * 100}%` }} />
                <span className="army-hp-text">
                  {totalHp.toFixed(1)} / {maxHp} PdV
                </span>
              </div>
              <button type="button" className="army-heal" disabled title="Soin à l'or — à venir">
                +
              </button>
            </div>
          </div>
          <div className="army-block army-block-stats">
            <div className="army-stat">
              <span className="army-stat-label">Stimulateur d'…</span>
              <span className="army-stat-value inactive">INACTIF</span>
            </div>
            <div className="army-stat">
              <span className="army-stat-label">Puissance estimée</span>
              <span className="army-stat-value">
                ATQ {totalAttack.toFixed(1)} DÉF {totalDefense.toFixed(1)}
              </span>
            </div>
            <div className="army-stat">
              <span className="army-stat-label">Vitesse de l'armée</span>
              <span className="army-stat-value">{armySpeed}</span>
            </div>
            <div className="army-stat">
              <span className="army-stat-label">Efficacité</span>
              <span className="army-stat-value">100.00%</span>
            </div>
          </div>
          <div className="army-block army-block-units">
            <div className="city-subhead">UNITÉS</div>
            <div className="army-unit-slots">
              {byType.map(([type, group]) => (
                <div key={type} className="army-unit-slot" title={UNIT_LABELS_FR[type]}>
                  <span className="army-unit-chevron">∧</span>
                  <div className="army-unit-diamond">
                    <UnitIcon type={type} />
                  </div>
                  <span className="army-unit-count">{group.length}</span>
                </div>
              ))}
              {Array.from({ length: Math.max(0, 3 - byType.length) }).map((_, i) => (
                <div key={i} className="army-unit-slot empty">
                  +
                </div>
              ))}
            </div>
          </div>
          <div className="army-block army-block-activity">
            <div className="city-subhead">ACTIVITÉ</div>
            {destinationName ? (
              <>
                <div className="army-activity-row moving">En marche vers</div>
                <div className="army-activity-place">{destinationName}</div>
                <button
                  type="button"
                  className="move-stop-btn"
                  onClick={() => {
                    for (const unit of units) stopUnit(unit.id)
                  }}
                >
                  ■ Stopper
                </button>
              </>
            ) : (
              <>
                <div className="army-activity-row">Position actuelle</div>
                <div className="army-activity-place">{currentProvince?.name ?? provinceId}</div>
              </>
            )}
            <div className="army-activity-hint">Cliquez une destination sur la carte (Échap : annuler)</div>
          </div>
          <button type="button" className="city-arrow city-arrow-right" onClick={() => onCycle(1)} title="Armée suivante">
            ►
          </button>
        </div>
      </div>
    </div>
  )
}
