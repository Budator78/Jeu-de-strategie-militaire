import { create } from 'zustand'
import {
  advanceTime,
  basicAI,
  createGameState,
  issueBuildOrder,
  issueMoveOrder,
  type GameState,
  type UnitTypeId,
} from '@con/engine'
import { buildScenario } from './scenario'

export const HUMAN_COUNTRY_ID = 'DEU'

/** 1 real second = this many simulated seconds. The source game runs at 1x (real time). */
export const AVAILABLE_TIME_SCALES = [1, 5, 15, 60, 300] as const

const SAVE_KEY = 'con-like-save-v1'
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
  saveGame: () => void
  loadGame: () => void
  newGame: () => void
}

function runAI(state: GameState, startOrderId: number): { state: GameState; nextOrderId: number } {
  let orderId = startOrderId
  let nextState = state
  for (const country of Object.values(nextState.countries)) {
    if (!country.isAI) continue
    for (const action of basicAI.decide(nextState, country.id)) {
      const id = `ai-order-${orderId++}`
      nextState =
        action.kind === 'build'
          ? issueBuildOrder(nextState, id, country.id, action.provinceId, action.unitType)
          : issueMoveOrder(nextState, id, country.id, action.unitId, action.toProvinceId)
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
  state: initialSave?.state ?? createGameState(buildScenario()),
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
    set({ state: createGameState(buildScenario()), nextOrderId: 1, hasSave: false, paused: false })
  },
}))
