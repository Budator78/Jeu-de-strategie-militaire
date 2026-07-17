import { useEffect, useMemo, useRef, useState } from 'react'
import { geoNaturalEarth1, geoPath } from 'd3-geo'
import { select } from 'd3-selection'
import { zoom, zoomIdentity, type D3ZoomEvent, type ZoomBehavior } from 'd3-zoom'
import { mesh } from 'topojson-client'
import { computeVisibleProvinces, type Unit } from '@con/engine'
import { adjacency, featureCollection, provinceFeatures, topology, OBJECT_NAME } from '../../data/geoData'
import { HUMAN_COUNTRY_ID, useGameStore } from '../../state/gameStore'
import { CITY_SIZE } from '../../state/scenario'
import { BUILDING_LABELS_FR, RESOURCE_LABELS_FR, UNIT_LABELS_FR } from '../../i18n/fr'
import { countryColor } from '../../utils/countryColor'
import { flagUrlFor } from '../../utils/flagUrls'
import { ConstructBuildingModal } from '../hud/ConstructBuildingModal'
import { HudIcon } from '../hud/icons'
import { ArmyPanel } from './ArmyPanel'
import { CityPanel } from './CityPanel'
import { MoveArrow } from './MoveArrow'
import { UnitModel } from './UnitModel'
import './MapView.css'

const WIDTH = 900
const HEIGHT = 700
/**
 * Below this zoom, cities are just dots ("from space"); past it the name fades
 * in, counter-scaled so it always reads at a small constant screen size like
 * the source game's "Mexico City(6)" labels.
 */
const CITY_LABEL_MIN_ZOOM = 2
const STACK_SPACING_SCREEN_PX = 26

// City medallion: a big, distinct, clickable marker (its own object, separate
// from the province land around it). Sized in map units, held at constant
// screen size via scale(1/zoomScale). Raised above the centroid so the troop
// counters (which sit below it) never cover it.
const CITY_R = 9
const CITY_MARKER_RISE = 13

// On-map unit "model" + attached flag badge (CoN style), in map units, kept at
// constant screen size via scale(1/zoomScale).
const MODEL_W = 50
const MODEL_H = 31
const BADGE_W = 17
const BADGE_H = 11
const BADGE_FLAG_W = 10

const projection = geoNaturalEarth1().fitSize([WIDTH, HEIGHT], featureCollection as never)
const pathGenerator = geoPath(projection)

// Faint triangulated "logistics network" connecting neighboring province
// centroids, like the mesh overlay in the source game's map.
const meshLinesPath = (() => {
  const centroids = new Map<string, [number, number]>()
  for (const f of provinceFeatures) centroids.set(f.id, pathGenerator.centroid(f as never))
  const seen = new Set<string>()
  let d = ''
  for (const [id, neighbors] of Object.entries(adjacency)) {
    const c1 = centroids.get(id)
    if (!c1) continue
    for (const neighborId of neighbors) {
      const key = id < neighborId ? `${id}|${neighborId}` : `${neighborId}|${id}`
      if (seen.has(key)) continue
      seen.add(key)
      const c2 = centroids.get(neighborId)
      if (!c2) continue
      d += `M${c1[0].toFixed(1)},${c1[1].toFixed(1)}L${c2[0].toFixed(1)},${c2[1].toFixed(1)}`
    }
  }
  return d
})()

interface TopoGeometry {
  id?: string | number
}

const centroidById = new Map<string, [number, number]>()
const areaById = new Map<string, number>()
for (const f of provinceFeatures) {
  centroidById.set(f.id, pathGenerator.centroid(f as never))
  areaById.set(f.id, pathGenerator.area(f as never))
}

/** Shortest hop route between two provinces over the adjacency graph (BFS), excluding the start. */
function findPath(fromId: string, toId: string): string[] | null {
  if (fromId === toId) return []
  const previous = new Map<string, string>()
  const seen = new Set([fromId])
  const queue = [fromId]
  while (queue.length > 0) {
    const current = queue.shift()!
    for (const neighbor of adjacency[current] ?? []) {
      if (seen.has(neighbor)) continue
      seen.add(neighbor)
      previous.set(neighbor, current)
      if (neighbor === toId) {
        const path = [toId]
        let step = current
        while (step !== fromId) {
          path.unshift(step)
          step = previous.get(step)!
        }
        return path
      }
      queue.push(neighbor)
    }
  }
  return null
}

interface UnitStack {
  key: string
  provinceId: string
  ownerId: string
  units: Unit[]
  x: number
  y: number
  offsetX: number
}

export function MapView({ onOpenSettings }: { onOpenSettings: () => void }) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const gRef = useRef<SVGGElement | null>(null)
  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // Whether the current selection is the city (medallion) or the province land
  // — they're now two distinct, separately clickable things.
  const [selectionMode, setSelectionMode] = useState<'city' | 'province'>('province')
  const [selectedStackKey, setSelectedStackKey] = useState<string | null>(null)
  // Province currently under the cursor — drives the move preview arrow.
  const [hoverProvinceId, setHoverProvinceId] = useState<string | null>(null)
  const [provinceConstructOpen, setProvinceConstructOpen] = useState(false)
  const [zoomScale, setZoomScale] = useState(1)
  const provinces = useGameStore((s) => s.state.provinces)
  const countries = useGameStore((s) => s.state.countries)
  const units = useGameStore((s) => s.state.units)
  const pendingOrders = useGameStore((s) => s.state.pendingOrders)
  const queueMovePath = useGameStore((s) => s.queueMovePath)
  const fogOfWar = useGameStore((s) => s.fogOfWar)

  useEffect(() => {
    if (!svgRef.current || !gRef.current) return
    const svgSelection = select(svgRef.current)
    const gSelection = select(gRef.current)
    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 40])
      .on('zoom', (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
        gSelection.attr('transform', event.transform.toString())
        setZoomScale(event.transform.k)
      })
    zoomBehaviorRef.current = zoomBehavior
    svgSelection.call(zoomBehavior)
    return () => {
      svgSelection.on('.zoom', null)
    }
  }, [])

  function zoomBy(factor: number) {
    if (!svgRef.current || !zoomBehaviorRef.current) return
    zoomBehaviorRef.current.scaleBy(select(svgRef.current), factor)
  }

  function resetZoom() {
    if (!svgRef.current || !zoomBehaviorRef.current) return
    zoomBehaviorRef.current.transform(select(svgRef.current), zoomIdentity)
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      void document.exitFullscreen()
    } else {
      void document.documentElement.requestFullscreen()
    }
  }

  const selected = useMemo(
    () => provinceFeatures.find((f) => f.id === selectedId) ?? null,
    [selectedId],
  )
  const selectedState = selectedId ? provinces[selectedId] : undefined
  const selectedOwner = selectedState?.ownerId ? countries[selectedState.ownerId] : null
  const unitsInSelectedProvince = useMemo(
    () => Object.values(units).filter((u) => u.provinceId === selectedId),
    [units, selectedId],
  )

  // The real-time loop hands us a fresh `units` object every tick, but the map
  // counters only care about where stacks are and what's in them — not each
  // unit's changing health. This signature stays identical across ticks unless
  // something actually moves, so the (heavy) troop layer keeps its identity and
  // React skips re-rendering hundreds of flag counters every frame.
  const unitSig = useMemo(() => {
    const counts = new Map<string, number>()
    for (const unit of Object.values(units)) {
      const k = `${unit.provinceId}|${unit.ownerId}|${unit.type}`
      counts.set(k, (counts.get(k) ?? 0) + 1)
    }
    return [...counts.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([k, n]) => `${k}:${n}`)
      .join(';')
  }, [units])

  // Which countries are at war with the human — used to tint counters. Stable
  // across ticks (unlike the countries object) unless a war actually changes.
  const atWarSig = useMemo(
    () =>
      Object.values(countries)
        .filter((c) => c.atWarWith.includes(HUMAN_COUNTRY_ID))
        .map((c) => c.id)
        .sort()
        .join(','),
    [countries],
  )

  // Province ownership fingerprint (stable insertion order) — changes only on a
  // capture, so map layers keyed on it skip the every-tick economy churn.
  const ownerSig = useMemo(() => Object.values(provinces).map((p) => p.ownerId ?? '_').join('|'), [provinces])

  const visibleProvinces = useMemo(() => {
    if (!fogOfWar) return null
    return computeVisibleProvinces(provinces, units, HUMAN_COUNTRY_ID)
    // Visibility depends only on ownership + unit positions (ownerSig/unitSig),
    // so it keeps a stable identity across ticks that don't move anything.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fogOfWar, ownerSig, unitSig])

  const unitStacks = useMemo(() => {
    const byKey = new Map<string, UnitStack>()
    for (const unit of Object.values(units)) {
      const key = `${unit.provinceId}|${unit.ownerId}`
      const existing = byKey.get(key)
      if (existing) {
        existing.units.push(unit)
      } else {
        byKey.set(key, { key, provinceId: unit.provinceId, ownerId: unit.ownerId, units: [unit], x: 0, y: 0, offsetX: 0 })
      }
    }
    const byProvince = new Map<string, UnitStack[]>()
    for (const stack of byKey.values()) {
      const list = byProvince.get(stack.provinceId) ?? []
      list.push(stack)
      byProvince.set(stack.provinceId, list)
    }
    const centroids = new Map<string, [number, number]>()
    for (const f of provinceFeatures) {
      if (byProvince.has(f.id)) centroids.set(f.id, pathGenerator.centroid(f as never))
    }
    for (const [provinceId, stacks] of byProvince) {
      const centroid = centroids.get(provinceId)
      if (!centroid) continue
      stacks.forEach((stack, index) => {
        stack.x = centroid[0]
        stack.y = centroid[1]
        stack.offsetX = index * STACK_SPACING_SCREEN_PX - ((stacks.length - 1) * STACK_SPACING_SCREEN_PX) / 2
      })
    }
    return [...byKey.values()]
    // Rebuilt only when stacks move/change (unitSig), not every tick. `units`
    // is read fresh whenever unitSig changes, so positions stay correct.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitSig])

  const selectedStack = selectedStackKey ? (unitStacks.find((s) => s.key === selectedStackKey) ?? null) : null
  const humanStacks = useMemo(() => unitStacks.filter((s) => s.ownerId === HUMAN_COUNTRY_ID), [unitStacks])

  // The troop counters are the map's heaviest layer (a flag <image> + sprite
  // per stack). Memoize the whole list so it only rebuilds when stacks move,
  // the view zooms, selection changes, fog shifts, or a war flips — never on a
  // plain economy/health tick.
  const troopCounters = useMemo(
    () =>
      unitStacks.map((stack) => {
        // Fog of war: foreign stacks outside your sight range stay hidden.
        if (
          visibleProvinces &&
          stack.ownerId !== HUMAN_COUNTRY_ID &&
          !visibleProvinces.has(stack.provinceId)
        ) {
          return null
        }
        const classes = ['unit-stack', ownerClass(stack.ownerId)]
        if (stack.key === selectedStackKey) classes.push('selected')
        // The model shows the stack's strongest unit — the "lead" you read at
        // a glance — with a small flag+count badge attached at the corner.
        const lead = stack.units.reduce((best, u) => (u.attack > best.attack ? u : best), stack.units[0])
        const flagUrl = flagUrlFor(stack.ownerId)
        const badgeCx = MODEL_W / 2 - 3
        const badgeCy = MODEL_H / 2 - 1
        return (
          <g
            key={stack.key}
            className={classes.join(' ')}
            transform={`translate(${stack.x}, ${stack.y}) scale(${1 / zoomScale}) translate(${stack.offsetX}, 9)`}
            onClick={(event) => handleStackClick(stack, event)}
            onMouseEnter={() => setHoverProvinceId(stack.provinceId)}
          >
            <ellipse className="unit-shadow" cx={0} cy={MODEL_H / 2 - 3.5} rx={MODEL_W * 0.34} ry={3.2} />
            {stack.key === selectedStackKey && (
              <ellipse className="unit-select-ring" cx={0} cy={MODEL_H / 2 - 3.5} rx={MODEL_W * 0.42} ry={4.4} />
            )}
            {/* Colored 2D unit model (nested viewport re-maps its 0..44 art). */}
            <svg
              className="unit-model"
              x={-MODEL_W / 2}
              y={-MODEL_H / 2}
              width={MODEL_W}
              height={MODEL_H}
              viewBox="6 6 39 24"
              overflow="visible"
            >
              <UnitModel type={lead.type} />
            </svg>
            {/* Flag + count badge, pinned to the model's lower-right corner. */}
            <g transform={`translate(${badgeCx}, ${badgeCy})`}>
              <rect className="badge-bg" x={-BADGE_W / 2} y={-BADGE_H / 2} width={BADGE_W} height={BADGE_H} rx={1.6} />
              {flagUrl ? (
                <image
                  href={flagUrl}
                  x={-BADGE_W / 2 + 0.8}
                  y={-BADGE_H / 2 + 0.8}
                  width={BADGE_FLAG_W}
                  height={BADGE_H - 1.6}
                  preserveAspectRatio="xMidYMid slice"
                />
              ) : (
                <rect
                  x={-BADGE_W / 2 + 0.8}
                  y={-BADGE_H / 2 + 0.8}
                  width={BADGE_FLAG_W}
                  height={BADGE_H - 1.6}
                  fill={countryColor(stack.ownerId)}
                />
              )}
              <text className="badge-count" x={BADGE_W / 2 - 3.3} y={1.8} textAnchor="middle">
                {stack.units.length}
              </text>
            </g>
          </g>
        )
      }),
    // handleStackClick/ownerClass read fresh state via the deps below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [unitStacks, zoomScale, selectedStackKey, visibleProvinces, atWarSig],
  )

  // The province choropleth is static geometry; only its fills/fog/selection
  // change. Memoized so the 300+ paths aren't reconciled on every clock tick.
  const provinceLayer = useMemo(
    () =>
      provinceFeatures.map((f) => {
        const provinceState = provinces[f.id]
        const classes = ['province', ownerClass(provinceState?.ownerId ?? null)]
        if (provinceState?.isCity) classes.push('city')
        if (f.id === selectedId) classes.push('selected')
        if (visibleProvinces && !visibleProvinces.has(f.id)) classes.push('fogged')
        return (
          <path
            key={f.id}
            d={pathGenerator(f as never) ?? undefined}
            className={classes.join(' ')}
            onClick={() => handleProvinceClick(f.id)}
            onMouseEnter={() => setHoverProvinceId(f.id)}
          >
            <title>{f.properties.name_en}</title>
          </path>
        )
      }),
    // selectedStackKey so the click handler marches a selected stack, not stale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ownerSig, atWarSig, selectedId, selectedStackKey, visibleProvinces],
  )

  function cycleStack(delta: number) {
    if (humanStacks.length === 0 || !selectedStack) return
    const index = humanStacks.findIndex((s) => s.key === selectedStack.key)
    const next = humanStacks[(index + delta + humanStacks.length) % humanStacks.length]
    setSelectedStackKey(next.key)
    setSelectedId(next.provinceId)
  }

  // Deselect the stack with Escape, like an RTS.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setSelectedStackKey(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  /**
   * Fog of war (shared engine rule, also applied to the AI): your provinces
   * plus neighbors, and one province around each of your units. null when
   * the admin toggle disables fog — everything visible.
   */
  // Marching routes of your own units (current hop + queued waypoints),
  // drawn as dashed arrows; identical stack routes are deduped.
  const movePaths = useMemo(() => {
    const routes = new Map<string, [number, number][]>()
    for (const order of pendingOrders) {
      if (order.kind !== 'move' || order.ownerId !== HUMAN_COUNTRY_ID) continue
      const stops = [order.fromProvinceId, order.toProvinceId, ...(order.remainingPath ?? [])]
      const key = stops.join('>')
      if (routes.has(key)) continue
      const points = stops
        .map((id) => centroidById.get(id))
        .filter((p): p is [number, number] => Boolean(p))
      if (points.length >= 2) routes.set(key, points)
    }
    return [...routes.entries()]
  }, [pendingOrders])

  // Move preview: with a stack selected, hovering a province shows a ghost
  // arrow of the route it would march before you commit with a click.
  const previewPoints = useMemo(() => {
    if (!selectedStack || !hoverProvinceId || hoverProvinceId === selectedStack.provinceId) return null
    const path = findPath(selectedStack.provinceId, hoverProvinceId)
    if (!path || path.length === 0) return null
    const points = [selectedStack.provinceId, ...path]
      .map((id) => centroidById.get(id))
      .filter((p): p is [number, number] => Boolean(p))
    return points.length >= 2 ? points : null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStackKey, hoverProvinceId])

  // Bright white outline hugging the human country's full border (land + coast),
  // like the selected-nation glow in the source game.
  const humanOutlinePath = useMemo(() => {
    const outlineMesh = mesh(
      topology as never,
      topology.objects[OBJECT_NAME] as never,
      (a: TopoGeometry, b: TopoGeometry | undefined) => {
        const aHuman = provinces[String(a.id)]?.ownerId === HUMAN_COUNTRY_ID
        const bHuman = b ? provinces[String(b.id)]?.ownerId === HUMAN_COUNTRY_ID : false
        return aHuman !== bHuman
      },
    )
    return pathGenerator(outlineMesh as never) ?? undefined
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerSig])

  // Front line: the shared border between two provinces whose owners are at war.
  const frontLinePath = useMemo(() => {
    const frontMesh = mesh(
      topology as never,
      topology.objects[OBJECT_NAME] as never,
      (a: TopoGeometry, b: TopoGeometry | undefined) => {
        if (!b) return false
        const ownerA = provinces[String(a.id)]?.ownerId ?? null
        const ownerB = provinces[String(b.id)]?.ownerId ?? null
        if (ownerA === null || ownerB === null || ownerA === ownerB) return false
        return countries[ownerA]?.atWarWith.includes(ownerB) ?? false
      },
    )
    return pathGenerator(frontMesh as never) ?? undefined
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerSig, atWarSig])

  // Cities are their own distinct, clickable objects — a big medallion raised
  // above the province centroid (so troop counters below never cover it),
  // separate from the province land around them.
  const cityMarkers = useMemo(
    () =>
      provinceFeatures
        .filter((f) => provinces[f.id]?.isCity)
        .map((f) => {
          const centroid = centroidById.get(f.id)
          if (!centroid) return null
          const owner = provinces[f.id]?.ownerId ?? null
          const classes = ['city-marker', ownerClass(owner)]
          if (f.id === selectedId && selectionMode === 'city') classes.push('selected')
          if (visibleProvinces && !visibleProvinces.has(f.id)) classes.push('fogged')
          const size = CITY_SIZE[f.id]
          return (
            <g
              key={f.id}
              className={classes.join(' ')}
              transform={`translate(${centroid[0]}, ${centroid[1]}) scale(${1 / zoomScale}) translate(0, ${-CITY_MARKER_RISE})`}
              onClick={(event) => handleCityClick(f.id, event)}
              onMouseEnter={() => setHoverProvinceId(f.id)}
            >
              <circle className="city-badge" r={CITY_R} />
              {/* Original tiny skyline glyph. */}
              <g className="city-glyph">
                <rect x={-5} y={-1} width={2.6} height={5} />
                <rect x={-1.6} y={-4} width={2.6} height={8} />
                <rect x={2} y={-2.5} width={2.6} height={6.5} />
              </g>
              {size !== undefined && (
                <>
                  <circle className="city-size-bg" cx={CITY_R - 1} cy={-CITY_R + 1} r={4} />
                  <text className="city-size" x={CITY_R - 1} y={-CITY_R + 3} textAnchor="middle">
                    {size}
                  </text>
                </>
              )}
              {zoomScale >= CITY_LABEL_MIN_ZOOM && (
                <text className="city-name" y={CITY_R + 8} textAnchor="middle">
                  {f.properties.name_en}
                </text>
              )}
            </g>
          )
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ownerSig, atWarSig, selectedId, selectionMode, selectedStackKey, visibleProvinces, zoomScale],
  )

  // Big territorial name labels (SCOTLAND, IRELAND…) — one per country, sized
  // by its total area (in map units so they scale with the terrain like CoN),
  // anchored on its largest province.
  const countryLabels = useMemo(() => {
    const byOwner = new Map<string, { area: number; anchor: [number, number]; anchorArea: number }>()
    for (const f of provinceFeatures) {
      const owner = provinces[f.id]?.ownerId
      if (!owner) continue
      const a = areaById.get(f.id) ?? 0
      const centroid = centroidById.get(f.id)
      if (!centroid) continue
      const entry = byOwner.get(owner)
      if (!entry) {
        byOwner.set(owner, { area: a, anchor: centroid, anchorArea: a })
      } else {
        entry.area += a
        if (a > entry.anchorArea) {
          entry.anchorArea = a
          entry.anchor = centroid
        }
      }
    }
    return [...byOwner.entries()]
      .filter(([, v]) => v.area > 180)
      .map(([owner, v]) => ({
        owner,
        name: (countries[owner]?.name ?? owner).toUpperCase(),
        anchor: v.anchor,
        // A constant screen size (applied as /zoomScale at render), gently
        // scaled by area and clamped so big countries don't dwarf the map.
        baseFont: Math.max(11, Math.min(21, Math.sqrt(v.area) * 1.3)),
      }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerSig])

  function handleProvinceClick(provinceId: string) {
    if (selectedStack) {
      // Clicking the stack's own province just deselects it.
      if (provinceId === selectedStack.provinceId) {
        setSelectedStackKey(null)
        return
      }
      // Click anywhere: BFS the route and march the whole stack there
      // (re-ordering a marching unit redirects it).
      const path = findPath(selectedStack.provinceId, provinceId)
      if (path && path.length > 0) {
        for (const unit of selectedStack.units) {
          queueMovePath(unit.id, path)
        }
        setSelectedStackKey(null)
        return
      }
    }
    setSelectedStackKey(null)
    setSelectedId(provinceId)
    setSelectionMode('province')
    setProvinceConstructOpen(false)
  }

  // The city medallion is its own object: clicking it opens the city, not the
  // province land underneath. It still accepts move orders when a stack is up.
  function handleCityClick(provinceId: string, event: React.MouseEvent) {
    event.stopPropagation()
    if (selectedStack) {
      if (provinceId === selectedStack.provinceId) {
        setSelectedStackKey(null)
        return
      }
      const path = findPath(selectedStack.provinceId, provinceId)
      if (path && path.length > 0) {
        for (const unit of selectedStack.units) queueMovePath(unit.id, path)
        setSelectedStackKey(null)
        return
      }
    }
    setSelectedStackKey(null)
    setSelectedId(provinceId)
    setSelectionMode('city')
    setProvinceConstructOpen(false)
  }

  function handleStackClick(stack: UnitStack, event: React.MouseEvent) {
    event.stopPropagation()
    // With a stack already selected, clicking elsewhere marches it there.
    if (selectedStack && stack.provinceId !== selectedStack.provinceId) {
      const path = findPath(selectedStack.provinceId, stack.provinceId)
      if (path && path.length > 0) {
        for (const unit of selectedStack.units) queueMovePath(unit.id, path)
        setSelectedStackKey(null)
        return
      }
    }
    if (stack.ownerId === HUMAN_COUNTRY_ID) {
      // Select ONLY the troop — don't open the province/city panel behind it.
      setSelectedStackKey(stack.key)
      setSelectedId(null)
    } else {
      // Can't command an enemy stack; fall back to inspecting its province.
      setSelectedStackKey(null)
      setSelectedId(stack.provinceId)
      setSelectionMode('province')
    }
  }

  function ownerClass(ownerId: string | null): string {
    if (ownerId === null) return 'owner-neutral'
    if (ownerId === HUMAN_COUNTRY_ID) return 'owner-human'
    if (countries[ownerId]?.atWarWith.includes(HUMAN_COUNTRY_ID)) return 'owner-enemy'
    if (ownerId === 'FRA') return 'owner-active-ai'
    return 'owner-passive'
  }

  return (
    <div className="map-view">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        className={`map-svg ${selectedStack ? 'targeting' : ''}`}
        role="img"
        aria-label="Carte du monde"
        onClick={(event) => {
          // A click on the bare ocean (not a province/stack) closes whatever is open.
          if (event.target === event.currentTarget) {
            setSelectedId(null)
            setSelectedStackKey(null)
          }
        }}
      >
        <defs>
          {/* Cheap satellite depth: per-allegiance vertical shading (lit from
              the north) instead of costly feTurbulence, which froze the map. */}
          <linearGradient id="landHuman" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8fb765" />
            <stop offset="100%" stopColor="#6b9147" />
          </linearGradient>
          <linearGradient id="landActiveAi" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9aa585" />
            <stop offset="100%" stopColor="#7c8768" />
          </linearGradient>
          <linearGradient id="landPassive" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a7af9d" />
            <stop offset="100%" stopColor="#8b9384" />
          </linearGradient>
          <linearGradient id="landEnemy" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ad6b56" />
            <stop offset="100%" stopColor="#894f3f" />
          </linearGradient>
          <linearGradient id="landNeutral" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a8b1a6" />
            <stop offset="100%" stopColor="#8b9489" />
          </linearGradient>
        </defs>
        <g ref={gRef}>
          {provinceLayer}
          <path d={meshLinesPath} className="mesh-lines" strokeWidth={0.5 / zoomScale} />
          {humanOutlinePath && <path d={humanOutlinePath} className="human-outline" strokeWidth={1.6 / zoomScale} />}
          {frontLinePath && <path d={frontLinePath} className="front-line" />}
          {/* Country names only while zoomed out; they hand off to city names
              at the same threshold so the map never shows both at once. */}
          {zoomScale < CITY_LABEL_MIN_ZOOM &&
            countryLabels.map((label) => (
              <text
                key={label.owner}
                className="country-label"
                x={label.anchor[0]}
                y={label.anchor[1]}
                textAnchor="middle"
                fontSize={label.baseFont / zoomScale}
                strokeWidth={(label.baseFont * 0.14) / zoomScale}
              >
                {label.name}
              </text>
            ))}
          {movePaths.map(([key, points]) => (
            <MoveArrow key={key} points={points} zoomScale={zoomScale} />
          ))}
          {previewPoints && <MoveArrow points={previewPoints} zoomScale={zoomScale} variant="preview" />}
          {cityMarkers}
          {troopCounters}
        </g>
      </svg>

      <div className="map-buttons">
        <button type="button" onClick={toggleFullscreen} title="Plein écran">
          <HudIcon name="fullscreen" />
        </button>
        <button type="button" onClick={() => zoomBy(1.6)} title="Zoomer">
          +
        </button>
        <button type="button" onClick={() => zoomBy(1 / 1.6)} title="Dézoomer">
          −
        </button>
        <button type="button" onClick={resetZoom} title="Vue globale">
          <HudIcon name="magnifier" />
        </button>
        <button type="button" title="Couches (à venir)">
          <HudIcon name="layers" />
        </button>
        <button type="button" onClick={onOpenSettings} title="Options">
          <HudIcon name="gear" />
        </button>
      </div>

      {selected && selectedState && selectedState.isCity && selectionMode === 'city' && (
        <CityPanel
          province={selectedState}
          fogged={Boolean(visibleProvinces && !visibleProvinces.has(selected.id))}
          onClose={() => setSelectedId(null)}
          onSelectProvince={(id) => {
            setSelectedId(id)
            setSelectionMode('city')
          }}
        />
      )}

      {selected && selectedState && selectionMode === 'province' && (
        <div className="province-panel">
          <div className="province-panel-header">
            <h2>{selected.properties.name_en}</h2>
            <button type="button" className="modal-close" onClick={() => setSelectedId(null)} aria-label="Fermer">
              ×
            </button>
          </div>
          <p className="province-kind">Province · {selectedOwner ? selectedOwner.name : 'Territoire libre'}</p>
          <ul className="yields">
            {Object.entries(selectedState.resources).map(([resource, amount]) => (
              <li key={resource}>
                {RESOURCE_LABELS_FR[resource as keyof typeof RESOURCE_LABELS_FR] ?? resource} : {amount}/min
              </li>
            ))}
          </ul>
          {selectedState.buildings.length > 0 && (
            <p className="province-buildings">
              Bâtiments : {selectedState.buildings.map((b) => BUILDING_LABELS_FR[b]).join(', ')}
            </p>
          )}
          {visibleProvinces && !visibleProvinces.has(selected.id) ? (
            <p className="province-fog-note">Zone hors de portée de vos renseignements.</p>
          ) : (
            unitsInSelectedProvince.length > 0 && (
              <ul className="unit-list">
                {unitsInSelectedProvince.map((u) => (
                  <li key={u.id}>
                    {UNIT_LABELS_FR[u.type]} ({u.ownerId}) — {Math.round(u.health)} pv
                  </li>
                ))}
              </ul>
            )
          )}
          {selectedState.ownerId === HUMAN_COUNTRY_ID && !selectedState.isCity && (
            <div className="production-buttons">
              <button type="button" onClick={() => setProvinceConstructOpen(true)}>
                Construire un bâtiment
              </button>
            </div>
          )}
          {selectedState.isCity && (
            <p className="province-kind">Cliquez le médaillon de la ville pour la gérer.</p>
          )}
        </div>
      )}

      {provinceConstructOpen && selected && selectedState && !selectedState.isCity && (
        <ConstructBuildingModal provinceId={selected.id} onClose={() => setProvinceConstructOpen(false)} />
      )}

      {selectedStack && (
        <ArmyPanel
          units={selectedStack.units}
          provinceId={selectedStack.provinceId}
          stackIndex={humanStacks.findIndex((s) => s.key === selectedStack.key)}
          onClose={() => setSelectedStackKey(null)}
          onCycle={cycleStack}
        />
      )}
    </div>
  )
}
