import { useMemo, useState } from 'react'
import { computeVictoryPoints, type DiplomaticStance } from '@con/engine'
import { HUMAN_COUNTRY_ID, useGameStore } from '../../state/gameStore'
import { ACTIVE_AI_COUNTRY_CODES } from '../../state/scenario'
import { countryColor, leaderCallsign } from '../../utils/countryColor'
import './hud.css'

const PLAYER_NAME = 'BUDATOR78'

type DiploTab = 'infos' | 'messages'

function StanceIcon({ stance }: { stance: DiplomaticStance }) {
  if (stance === 'war') {
    return (
      <span className="stance-icon stance-war" title="Guerre">
        <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
          <path d="M4 3 L15 14 M15 3 L4 14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M3 15 l3 3 M14 18 l3 -3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
    )
  }
  if (stance === 'rightOfWay') {
    return (
      <span className="stance-icon stance-row" title="Droit de passage">
        <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
          <path d="M3 10 h11 M11 5 l5 5 -5 5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    )
  }
  return (
    <span className="stance-icon stance-peace" title="Paix">
      <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
        <path d="M3 12 Q7 10 9 7 Q10 9 13 9 L17 8 L14 11 Q11 15 5 14 L2 16 L4 13 Z" fill="currentColor" />
        <path d="M9 7 Q10 3 14 3 Q11 5 11 8 Z" fill="currentColor" />
      </svg>
    </span>
  )
}

export function DiplomacyModal({ onClose }: { onClose: () => void }) {
  const state = useGameStore((s) => s.state)
  const declareWar = useGameStore((s) => s.declareWar)
  const offerPeace = useGameStore((s) => s.offerPeace)
  const grantPassage = useGameStore((s) => s.grantPassage)
  const [tab, setTab] = useState<DiploTab>('infos')
  const [search, setSearch] = useState('')

  const human = state.countries[HUMAN_COUNTRY_ID]

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return Object.values(state.countries)
      .filter((c) => c.id !== HUMAN_COUNTRY_ID && c.alive)
      .map((c) => {
        const cityCount = Object.values(state.provinces).filter((p) => p.ownerId === c.id && p.isCity).length
        const vp = computeVictoryPoints(state, c.id)
        const atWar = human?.atWarWith.includes(c.id) ?? false
        const theirStance: DiplomaticStance = atWar ? 'war' : (c.stances[HUMAN_COUNTRY_ID] ?? 'peace')
        const yourStance: DiplomaticStance = atWar ? 'war' : (human?.stances[c.id] ?? 'peace')
        return { country: c, cityCount, vp, theirStance, yourStance, atWar }
      })
      .filter((r) => !q || r.country.name.toLowerCase().includes(q))
      .sort((a, b) => b.vp - a.vp)
  }, [state, human, search])

  function onStanceChange(targetId: string, next: string) {
    if (next === 'war') declareWar(targetId)
    else if (next === 'peace') {
      offerPeace(targetId)
      grantPassage(targetId, false)
    } else if (next === 'rightOfWay') grantPassage(targetId, true)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="diplo-modal" onClick={(e) => e.stopPropagation()}>
        <div className="diplo-header">
          <span className="diplo-title">DIPLOMATIE</span>
          <button type="button" className="market-close" onClick={onClose} aria-label="Fermer">
            X
          </button>
        </div>
        <div className="diplo-tabs">
          <button type="button" className={tab === 'infos' ? 'active' : ''} onClick={() => setTab('infos')}>
            INFORMATIONS
          </button>
          <button type="button" className={tab === 'messages' ? 'active' : ''} onClick={() => setTab('messages')}>
            MESSAGES ET TRANSACTIONS
          </button>
        </div>
        {tab === 'infos' && (
          <>
            <div className="diplo-searchbar">
              <input
                type="search"
                placeholder="Recherche…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="diplo-table-wrap">
              <table className="diplo-table">
                <thead>
                  <tr>
                    <th>Nation</th>
                    <th>Nom du leader</th>
                    <th>Villes</th>
                    <th>PV</th>
                    <th>Leurs relations</th>
                    <th>Vos relations</th>
                    <th>Type de joueur</th>
                    <th>Courrier</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ country, cityCount, vp, theirStance, yourStance }) => {
                    const isActiveAI = ACTIVE_AI_COUNTRY_CODES.includes(country.id)
                    return (
                      <tr key={country.id}>
                        <td>
                          <span className="diplo-flag" style={{ background: countryColor(country.id) }} />
                          <span className="diplo-nation">{country.name}</span>
                        </td>
                        <td className="diplo-leader">{country.isAI ? leaderCallsign(country.id) : PLAYER_NAME}</td>
                        <td className="diplo-num">{cityCount}</td>
                        <td className="diplo-num">★{vp}</td>
                        <td className="diplo-center">
                          <StanceIcon stance={theirStance} />
                        </td>
                        <td className="diplo-center">
                          <span className="diplo-your-relation">
                            <StanceIcon stance={yourStance} />
                            <select
                              value={yourStance}
                              onChange={(e) => onStanceChange(country.id, e.target.value)}
                              title="Changer vos relations"
                            >
                              <option value="peace">Paix</option>
                              <option value="rightOfWay">Droit de passage</option>
                              <option value="war">Guerre</option>
                            </select>
                          </span>
                        </td>
                        <td className="diplo-center diplo-playertype">
                          {isActiveAI ? 'IA active' : country.isAI ? 'IA passive' : 'Humain'}
                        </td>
                        <td className="diplo-center">
                          <button type="button" className="diplo-mail" disabled title="Messagerie à venir">
                            ✉
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
        {tab === 'messages' && (
          <div className="diplo-messages">
            <p>Aucun message — la messagerie diplomatique arrivera avec le multijoueur.</p>
          </div>
        )}
      </div>
    </div>
  )
}
