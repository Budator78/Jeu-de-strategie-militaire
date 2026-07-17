/**
 * A fat CoN-style movement arrow following a route of map points: a rounded
 * outlined "tube" body with a big arrowhead at the destination. Sizes are in
 * screen px (divided by zoomScale) so the arrow stays a constant thickness at
 * any zoom. `variant="preview"` renders the dashed ghost shown while aiming a
 * move; `variant="order"` is a committed march order.
 */

const BODY_W = 4.5 // arrow body thickness, screen px
const EDGE = 1.4 // dark outline width added around the body
const HEAD_LEN = 10 // arrowhead length, screen px
const HEAD_HALF = 6.5 // arrowhead half-width, screen px

export function MoveArrow({
  points,
  zoomScale,
  variant = 'order',
}: {
  points: [number, number][]
  zoomScale: number
  variant?: 'order' | 'preview'
}) {
  if (points.length < 2) return null

  const tip = points[points.length - 1]
  const prev = points[points.length - 2]
  const dx = tip[0] - prev[0]
  const dy = tip[1] - prev[1]
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const headLen = HEAD_LEN / zoomScale
  const half = HEAD_HALF / zoomScale

  // Stop the body where the arrowhead begins so it doesn't poke through.
  const baseX = tip[0] - ux * headLen
  const baseY = tip[1] - uy * headLen
  const perpX = -uy
  const perpY = ux

  const body = [...points.slice(0, -1), [baseX, baseY] as [number, number]]
    .map(([x, y]) => `${x},${y}`)
    .join(' ')
  const head = `${tip[0]},${tip[1]} ${baseX + perpX * half},${baseY + perpY * half} ${baseX - perpX * half},${baseY - perpY * half}`

  return (
    <g className={`move-arrow ${variant}`} pointerEvents="none">
      <polyline className="arrow-edge" points={body} strokeWidth={(BODY_W + EDGE * 2) / zoomScale} />
      <polyline className="arrow-fill" points={body} strokeWidth={BODY_W / zoomScale} />
      <polygon className="arrow-head" points={head} strokeWidth={EDGE / zoomScale} />
    </g>
  )
}
