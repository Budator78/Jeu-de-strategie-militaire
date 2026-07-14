import { useEffect, useRef } from 'react'
import { useGameStore } from '../state/gameStore'

/**
 * 1 real second = this many simulated seconds. The source game runs at 1x
 * (real wall-clock time); this is purely a convenience so testing/experimenting
 * doesn't mean waiting real hours for resources to accumulate.
 */
const TIME_SCALE = 60
const TICK_INTERVAL_MS = 250

/** Drives the continuous simulation — the source game has no manual "end turn". */
export function useGameLoop() {
  const tick = useGameStore((s) => s.tick)
  const paused = useGameStore((s) => s.paused)
  const lastTickRef = useRef<number | null>(null)

  useEffect(() => {
    if (paused) {
      lastTickRef.current = null
      return
    }
    lastTickRef.current = Date.now()
    const interval = setInterval(() => {
      const now = Date.now()
      const realElapsedMs = now - (lastTickRef.current ?? now)
      lastTickRef.current = now
      tick(realElapsedMs * TIME_SCALE)
    }, TICK_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [paused, tick])
}
