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

interface GameStore {
  state: GameState
  paused: boolean
  nextOrderId: number
  tick: (elapsedMs: number) => void
  setPaused: (paused: boolean) => void
  queueBuild: (provinceId: string, unitType: UnitTypeId) => void
  queueMove: (unitId: string, toProvinceId: string) => void
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

export const useGameStore = create<GameStore>((set, get) => ({
  state: createGameState(buildScenario()),
  paused: false,
  nextOrderId: 1,
  tick: (elapsedMs) =>
    set((s) => {
      const advanced = advanceTime(s.state, elapsedMs)
      const { state, nextOrderId } = runAI(advanced, s.nextOrderId)
      return { state, nextOrderId }
    }),
  setPaused: (paused) => set({ paused }),
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
}))
