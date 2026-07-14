import { useEffect, useRef } from 'react'
import { useGameStore } from '../state/gameStore'

const TICK_INTERVAL_MS = 250

/** Drives the continuous simulation — the source game has no manual "end turn". */
export function useGameLoop() {
  const tick = useGameStore((s) => s.tick)
  const paused = useGameStore((s) => s.paused)
  const timeScale = useGameStore((s) => s.timeScale)
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
      tick(realElapsedMs * timeScale)
    }, TICK_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [paused, timeScale, tick])
}
