import { useMemo, useState } from 'react'
import { geoNaturalEarth1, geoPath } from 'd3-geo'
import { computeNetIncomePerMinute, computeVictoryPoints } from '@con/engine'
import { featureCollection, provinceFeatures } from '../../data/geoData'
import { HUMAN_COUNTRY_ID, useGameStore } from '../../state/gameStore'
import { eventToArticle, formatEventTime } from '../../i18n/fr'
import { countryColor } from '../../utils/countryColor'
import { CountryFlag } from './CountryFlag'
import './hud.css'

const MINI_W = 300
const MINI_H = 170
const miniProjection = geoNaturalEarth1().fitSize([MINI_W, MINI_H], featureCollection as never)
const miniPath = geoPath(miniProjection)

type IndexTab = 'nations' | 'alliances' | 'stats'
type FeedFilter = 'tout' | 'moi' | 'ennemis' | 'politique' | 'economie'

const DAY_MS = 86_400_000

export function NewspaperModal({ onClose }: { onClose: () => void }) {
  const state = useGameStore((s) => s.state)
  const publishArticle = useGameStore((s) => s.publishArticle)
  const currentDay = Math.floor(state.clockMs / DAY_MS) + 1
  const [day, setDay] = useState(currentDay)
  const [indexTab, setIndexTab] = useState<IndexTab>('nations')
  const [filter, setFilter] = useState<FeedFilter>('tout')
  const [search, setSearch] = useState('')
  const [writing, setWriting] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftBody, setDraftBody] = useState('')

  const countryName = (id: string | null) => (id ? (state.countries[id]?.name ?? id) : 'Territoire libre')

  const nationsRanking = useMemo(
    () =>
      Object.values(state.countries)
        .filter((c) => c.alive)
        .map((c) => ({ id: c.id, name: c.name, vp: computeVictoryPoints(state, c.id) }))
        .sort((a, b) => b.vp - a.vp)
        .slice(0, 20),
    [state],
  )

  const productionRanking = useMemo(
    () =>
      Object.values(state.countries)
        .filter((c) => c.alive)
        .map((c) => {
          const perMin = computeNetIncomePerMinute(state, c.id)
          const perDay = Math.round(Object.values(perMin).reduce((sum, v) => sum + Math.max(0, v), 0) * 1440)
          return { id: c.id, name: c.name, perDay }
        })
        .sort((a, b) => b.perDay - a.perDay)
        .slice(0, 20),
    [state],
  )

  const feed = useMemo(() => {
    const dayStart = (day - 1) * DAY_MS
    const dayEnd = day * DAY_MS
    const eventEntries = state.events
      .filter((e) => e.atMs >= dayStart && e.atMs < dayEnd)
      .map((e) => ({ atMs: e.atMs, article: eventToArticle(e, countryName), author: null as string | null }))
    const playerEntries = state.articles
      .filter((a) => a.atMs >= dayStart && a.atMs < dayEnd)
      .map((a) => ({
        atMs: a.atMs,
        article: {
          headline: a.title,
          body: `${formatEventTime(a.atMs)} — ${a.body}`,
          category: 'politique' as const,
          involved: [a.authorCountryId],
        },
        author: a.authorCountryId,
      }))
    let entries = [...eventEntries, ...playerEntries].sort((a, b) => b.atMs - a.atMs)
    if (filter === 'moi') entries = entries.filter((e) => e.article.involved.includes(HUMAN_COUNTRY_ID))
    if (filter === 'ennemis') {
      const enemies = state.countries[HUMAN_COUNTRY_ID]?.atWarWith ?? []
      entries = entries.filter((e) => e.article.involved.some((id) => enemies.includes(id)))
    }
    if (filter === 'politique') entries = entries.filter((e) => e.article.category === 'politique')
    if (filter === 'economie') entries = entries.filter((e) => e.article.category === 'economie')
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      entries = entries.filter(
        (e) => e.article.headline.toLowerCase().includes(q) || e.article.body.toLowerCase().includes(q),
      )
    }
    return entries.slice(0, 40)
  }, [state, day, filter, search])

  function submitArticle() {
    publishArticle(draftTitle, draftBody)
    setDraftTitle('')
    setDraftBody('')
    setWriting(false)
    setDay(currentDay)
    setFilter('tout')
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="news-modal" onClick={(e) => e.stopPropagation()}>
        <div className="news-masthead">
          <div className="news-logo">
            <div className="news-logo-mark">▐▐▐</div>
            <div className="news-logo-text">news</div>
          </div>
          <button type="button" className="market-close" onClick={onClose} aria-label="Fermer">
            X
          </button>
        </div>
        <div className="news-topline">
          <span>Jour {day}</span>
          <span className="news-topline-right">
            <button type="button" onClick={() => setDay(Math.max(1, day - 1))}>
              «
            </button>
            <span className="news-day-chip">{day}</span>
            <button type="button" onClick={() => setDay(Math.min(currentDay, day + 1))}>
              »
            </button>
            <button type="button" className="news-write" onClick={() => setWriting(!writing)}>
              Rédiger un article
            </button>
          </span>
        </div>
        {writing && (
          <div className="news-editor">
            <input
              type="text"
              placeholder="Titre de l'article"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
            />
            <textarea
              placeholder="Votre communiqué…"
              rows={3}
              value={draftBody}
              onChange={(e) => setDraftBody(e.target.value)}
            />
            <button type="button" disabled={!draftTitle.trim()} onClick={submitArticle}>
              Publier
            </button>
          </div>
        )}
        <div className="news-upper">
          <svg viewBox={`0 0 ${MINI_W} ${MINI_H}`} className="news-minimap" aria-label="Carte politique">
            <rect width={MINI_W} height={MINI_H} fill="#31424f" />
            {provinceFeatures.map((f) => {
              const ownerId = state.provinces[f.id]?.ownerId
              return (
                <path
                  key={f.id}
                  d={miniPath(f as never) ?? undefined}
                  fill={ownerId ? countryColor(ownerId) : '#7d8890'}
                  stroke="#2b3540"
                  strokeWidth={0.2}
                />
              )
            })}
          </svg>
          <div className="news-index">
            <div className="news-index-tabs">
              <button type="button" className={indexTab === 'nations' ? 'active' : ''} onClick={() => setIndexTab('nations')}>
                INDEX DES NATIONS (PV)
              </button>
              <button
                type="button"
                className={indexTab === 'alliances' ? 'active' : ''}
                onClick={() => setIndexTab('alliances')}
              >
                INDEX DES ALLIANCES
              </button>
              <button type="button" className={indexTab === 'stats' ? 'active' : ''} onClick={() => setIndexTab('stats')}>
                STATISTIQUES
              </button>
            </div>
            <div className="news-index-list">
              {indexTab === 'nations' &&
                nationsRanking.map((n, i) => (
                  <div key={n.id} className={`news-rank-row ${n.id === HUMAN_COUNTRY_ID ? 'me' : ''}`}>
                    <span className="news-rank-pos">{i + 1}.</span>
                    <CountryFlag id={n.id} className="news-rank-flag" />
                    <span className="news-rank-name">{n.name}</span>
                    <span className="news-rank-star">★</span>
                    <span className="news-rank-score">{n.vp}</span>
                  </div>
                ))}
              {indexTab === 'alliances' && <p className="news-empty">Aucune alliance dans cette partie.</p>}
              {indexTab === 'stats' &&
                productionRanking.map((n, i) => (
                  <div key={n.id} className={`news-rank-row ${n.id === HUMAN_COUNTRY_ID ? 'me' : ''}`}>
                    <span className="news-rank-pos">{i + 1}.</span>
                    <CountryFlag id={n.id} className="news-rank-flag" />
                    <span className="news-rank-name">{n.name}</span>
                    <span className="news-rank-score">{n.perDay.toLocaleString('en-US')}/j</span>
                  </div>
                ))}
            </div>
            <div className="news-victory-note">
              Condition de victoire : {state.config.victoryPointTarget.toLocaleString('en-US')} points de victoire
            </div>
          </div>
        </div>
        <div className="news-filterbar">
          {(
            [
              ['tout', 'TOUT'],
              ['moi', 'MOI'],
              ['ennemis', 'AMIS ET ENNEMIS'],
              ['politique', 'POLITIQUE'],
              ['economie', 'ÉCONOMIE'],
            ] as Array<[FeedFilter, string]>
          ).map(([key, label]) => (
            <button key={key} type="button" className={filter === key ? 'active' : ''} onClick={() => setFilter(key)}>
              {label}
            </button>
          ))}
          <input
            type="search"
            className="news-search"
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="news-feed">
          {feed.length === 0 && <p className="news-empty">Rien à signaler ce jour-là.</p>}
          {feed.map((entry, index) => (
            <article key={index} className="news-article">
              <div className="news-article-source">
                {countryName(entry.article.involved[0] ?? null)} — Communiqué de presse officiel
                {entry.author ? ' du joueur' : ' du gouvernement'}
              </div>
              <h3>{entry.article.headline}</h3>
              <p>{entry.article.body}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}
