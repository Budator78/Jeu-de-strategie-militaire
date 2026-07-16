import { create } from 'zustand'
import {
  advanceTime,
  basicAI,
  boostMoraleWithGold,
  createGameState,
  declareWarOn,
  executeMarketTrade,
  hasOfferedPeace,
  issueBuildOrder,
  issueConstructOrder,
  issueMoveOrder,
  issueResearchOrder,
  offerPeace,
  retractPeaceOffer,
  setRightOfWay,
  writeArticle,
  type BuildingId,
  type GameState,
  type ResearchId,
  type UnitTypeId,
} from '@con/engine'
import { ACTIVE_AI_COUNTRY_CODES, buildScenario } from './scenario'

export const HUMAN_COUNTRY_ID = 'DEU'

/** 1 real second = this many simulated seconds. The source game runs at 1x (real time). */
export const AVAILABLE_TIME_SCALES = [1, 5, 15, 60, 300] as const

// v5: Country grew peaceOffersTo (mutual-consent peace) — older saves are incompatible.
const SAVE_KEY = 'con-like-save-v5'
const AUTOSAVE_EVERY_N_TICKS = 20

interface SaveFile {
  state: GameState
  nextOrderId: number
}

interface GameStore {
  state: GameState
  paused: boolean
  timeScale: number
  nextOrderId: number
  ticksSinceAutosave: number
  hasSave: boolean
  tick: (elapsedMs: number) => void
  setPaused: (paused: boolean) => void
  setTimeScale: (timeScale: number) => void
  queueBuild: (provinceId: string, unitType: UnitTypeId) => void
  queueMove: (unitId: string, toProvinceId: string) => void
  queueConstruct: (provinceId: string, buildingId: BuildingId) => void
  queueResearch: (researchId: ResearchId) => void
  trade: (offerId: string) => void
  publishArticle: (title: string, body: string) => void
  boostMorale: (provinceId: string) => void
  declareWar: (targetId: string) => void
  proposePeace: (targetId: string) => void
  withdrawPeaceOffer: (targetId: string) => void
  grantPassage: (targetId: string, granted: boolean) => void
  saveGame: () => void
  loadGame: () => void
  newGame: () => void
}

function runAI(state: GameState, startOrderId: number): { state: GameState; nextOrderId: number } {
  let orderId = startOrderId
  let nextState = state
  for (const country of Object.values(nextState.countries)) {
    if (!country.isAI) continue
    // Passive nations (everyone except ACTIVE_AI_COUNTRY_CODES) own their
    // territory and start with a garrison, but never act — see scenario.ts.
    // Their one reaction: they gladly accept any peace offer extended to them.
    if (!ACTIVE_AI_COUNTRY_CODES.includes(country.id)) {
      for (const enemyId of country.atWarWith) {
        if (hasOfferedPeace(nextState, enemyId, country.id)) {
          nextState = offerPeace(nextState, country.id, enemyId)
        }
      }
      continue
    }
    for (const action of basicAI.decide(nextState, country.id)) {
      const id = `ai-order-${orderId++}`
      if (action.kind === 'build') {
        nextState = issueBuildOrder(nextState, id, country.id, action.provinceId, action.unitType)
      } else if (action.kind === 'construct') {
        nextState = issueConstructOrder(nextState, id, country.id, action.provinceId, action.buildingId)
      } else if (action.kind === 'research') {
        nextState = issueResearchOrder(nextState, id, country.id, action.researchId)
      } else if (action.kind === 'acceptPeace') {
        nextState = offerPeace(nextState, country.id, action.targetId)
      } else {
        nextState = issueMoveOrder(nextState, id, country.id, action.unitId, action.toProvinceId)
      }
    }
  }
  return { state: nextState, nextOrderId: orderId }
}

function readSaveFile(): SaveFile | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SaveFile
  } catch {
    return null
  }
}

function writeSaveFile(save: SaveFile) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save))
  } catch {
    // localStorage unavailable/full — silently skip, not critical to gameplay.
  }
}

const initialSave = readSaveFile()

export const useGameStore = create<GameStore>((set, get) => ({
  state: initialSave?.state ?? createGameState(buildScenario(HUMAN_COUNTRY_ID)),
  paused: false,
  timeScale: 1,
  nextOrderId: initialSave?.nextOrderId ?? 1,
  ticksSinceAutosave: 0,
  hasSave: initialSave !== null,
  tick: (elapsedMs) =>
    set((s) => {
      const advanced = advanceTime(s.state, elapsedMs)
      const { state, nextOrderId } = runAI(advanced, s.nextOrderId)
      const ticksSinceAutosave = s.ticksSinceAutosave + 1
      if (ticksSinceAutosave >= AUTOSAVE_EVERY_N_TICKS) {
        writeSaveFile({ state, nextOrderId })
        return { state, nextOrderId, ticksSinceAutosave: 0, hasSave: true }
      }
      return { state, nextOrderId, ticksSinceAutosave }
    }),
  setPaused: (paused) => set({ paused }),
  setTimeScale: (timeScale) => set({ timeScale }),
  queueBuild: (provinceId, unitType) => {
    const orderId = `order-${get().nextOrderId}`
    set((s) => ({
      nextOrderId: s.nextOrderId + 1,
      state: issueBuildOrder(s.state, orderId, HUMAN_COUNTRY_ID, provinceId, unitType),
    }))
  },
  queueMove: (unitId, toProvinceId) => {
    const orderId = `order-${get().nextOrderId}`
    set((s) => ({
      nextOrderId: s.nextOrderId + 1,
      state: issueMoveOrder(s.state, orderId, HUMAN_COUNTRY_ID, unitId, toProvinceId),
    }))
  },
  queueConstruct: (provinceId, buildingId) => {
    const orderId = `order-${get().nextOrderId}`
    set((s) => ({
      nextOrderId: s.nextOrderId + 1,
      state: issueConstructOrder(s.state, orderId, HUMAN_COUNTRY_ID, provinceId, buildingId),
    }))
  },
  queueResearch: (researchId) => {
    const orderId = `order-${get().nextOrderId}`
    set((s) => ({
      nextOrderId: s.nextOrderId + 1,
      state: issueResearchOrder(s.state, orderId, HUMAN_COUNTRY_ID, researchId),
    }))
  },
  trade: (offerId) => {
    set((s) => ({ state: executeMarketTrade(s.state, HUMAN_COUNTRY_ID, offerId) }))
  },
  publishArticle: (title, body) => {
    const articleId = `article-${get().nextOrderId}`
    set((s) => ({
      nextOrderId: s.nextOrderId + 1,
      state: writeArticle(s.state, articleId, HUMAN_COUNTRY_ID, title, body),
    }))
  },
  boostMorale: (provinceId) => {
    set((s) => ({ state: boostMoraleWithGold(s.state, HUMAN_COUNTRY_ID, provinceId) }))
  },
  declareWar: (targetId) => {
    set((s) => ({ state: declareWarOn(s.state, HUMAN_COUNTRY_ID, targetId) }))
  },
  proposePeace: (targetId) => {
    set((s) => ({ state: offerPeace(s.state, HUMAN_COUNTRY_ID, targetId) }))
  },
  withdrawPeaceOffer: (targetId) => {
    set((s) => ({ state: retractPeaceOffer(s.state, HUMAN_COUNTRY_ID, targetId) }))
  },
  grantPassage: (targetId, granted) => {
    set((s) => ({ state: setRightOfWay(s.state, HUMAN_COUNTRY_ID, targetId, granted) }))
  },
  saveGame: () => {
    const s = get()
    writeSaveFile({ state: s.state, nextOrderId: s.nextOrderId })
    set({ hasSave: true })
  },
  loadGame: () => {
    const save = readSaveFile()
    if (!save) return
    set({ state: save.state, nextOrderId: save.nextOrderId })
  },
  newGame: () => {
    try {
      localStorage.removeItem(SAVE_KEY)
    } catch {
      // ignore
    }
    set({ state: createGameState(buildScenario(HUMAN_COUNTRY_ID)), nextOrderId: 1, hasSave: false, paused: false })
  },
}))
