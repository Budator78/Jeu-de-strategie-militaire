import { useEffect, useMemo, useRef, useState } from 'react'
import { geoNaturalEarth1, geoPath } from 'd3-geo'
import { select } from 'd3-selection'
import { zoom, zoomIdentity, type D3ZoomEvent, type ZoomBehavior } from 'd3-zoom'
import { mesh } from 'topojson-client'
import type { Unit } from '@con/engine'
import { adjacency, featureCollection, provinceFeatures, topology, OBJECT_NAME } from '../../data/geoData'
import { HUMAN_COUNTRY_ID, useGameStore } from '../../state/gameStore'
import { CITY_SIZE } from '../../state/scenario'
import { RESOURCE_LABELS_FR, UNIT_LABELS_FR } from '../../i18n/fr'
import { HudIcon } from '../hud/icons'
import { CityPanel } from './CityPanel'
import './MapView.css'

const WIDTH = 900
const HEIGHT = 700
/**
 * Below this zoom, cities are just dots ("from space"); past it the name fades
 * in, counter-scaled so it always reads at a small constant screen size like
 * the source game's "Mexico City(6)" labels.
 */
const CITY_LABEL_MIN_ZOOM = 2
const CITY_LABEL_FONT_SCREEN_PX = 8.5
const STACK_SPACING_SCREEN_PX = 24

const UNIT_GLYPH: Record<string, string> = {
  infantry: 'I',
  nationalGuard: 'G',
  mechInfantry: 'M',
  recon: 'R',
  afv: 'V',
  tank: 'T',
  gunship: 'H',
  attackHelicopter: 'A',
  fighter: 'F',
}

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
for (const f of provinceFeatures) centroidById.set(f.id, pathGenerator.centroid(f as never))

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
  const [selectedStackKey, setSelectedStackKey] = useState<string | null>(null)
  const [zoomScale, setZoomScale] = useState(1)
  const provinces = useGameStore((s) => s.state.provinces)
  const countries = useGameStore((s) => s.state.countries)
  const units = useGameStore((s) => s.state.units)
  const pendingOrders = useGameStore((s) => s.state.pendingOrders)
  const queueMovePath = useGameStore((s) => s.queueMovePath)
  const stopUnit = useGameStore((s) => s.stopUnit)
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

  const movingUnitIds = useMemo(
    () => new Set(pendingOrders.filter((o) => o.kind === 'move').map((o) => (o.kind === 'move' ? o.unitId : ''))),
    [pendingOrders],
  )

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
  }, [units])

  const selectedStack = selectedStackKey ? (unitStacks.find((s) => s.key === selectedStackKey) ?? null) : null

  // Deselect the stack with Escape, like an RTS.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setSelectedStackKey(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  /**
   * Fog of war (view-level): you see your own provinces, their neighbors,
   * and anywhere your units stand (plus one province around them). null when
   * the admin toggle disables fog — everything visible.
   */
  const visibleProvinces = useMemo(() => {
    if (!fogOfWar) return null
    const visible = new Set<string>()
    const reveal = (id: string) => {
      visible.add(id)
      for (const neighbor of adjacency[id] ?? []) visible.add(neighbor)
    }
    for (const province of Object.values(provinces)) {
      if (province.ownerId === HUMAN_COUNTRY_ID) reveal(province.id)
    }
    for (const unit of Object.values(units)) {
      if (unit.ownerId === HUMAN_COUNTRY_ID) reveal(unit.provinceId)
    }
    return visible
  }, [fogOfWar, provinces, units])

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
  }, [provinces])

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
  }, [provinces, countries])

  const cityLabels = useMemo(
    () =>
      provinceFeatures
        .filter((f) => provinces[f.id]?.isCity)
        .map((f) => ({ feature: f, centroid: pathGenerator.centroid(f as never) })),
    [provinces],
  )

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
  }

  function handleStackClick(stack: UnitStack, event: React.MouseEvent) {
    event.stopPropagation()
    setSelectedId(stack.provinceId)
    setSelectedStackKey(stack.ownerId === HUMAN_COUNTRY_ID ? stack.key : null)
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
      >
        <g ref={gRef}>
          {provinceFeatures.map((f) => {
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
              >
                <title>{f.properties.name_en}</title>
              </path>
            )
          })}
          <path d={meshLinesPath} className="mesh-lines" strokeWidth={0.5 / zoomScale} />
          {humanOutlinePath && <path d={humanOutlinePath} className="human-outline" strokeWidth={1.6 / zoomScale} />}
          {frontLinePath && <path d={frontLinePath} className="front-line" />}
          {movePaths.map(([key, points]) => (
            <g key={key} className="move-path">
              <polyline
                points={points.map(([x, y]) => `${x},${y}`).join(' ')}
                strokeWidth={1.6 / zoomScale}
                strokeDasharray={`${4 / zoomScale} ${3 / zoomScale}`}
              />
              <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r={2.6 / zoomScale} />
            </g>
          ))}
          {cityLabels.map(({ feature, centroid }) => (
            <g key={feature.id} className="city-label" transform={`translate(${centroid[0]}, ${centroid[1]})`}>
              <circle r={2.2 / zoomScale} />
              {zoomScale >= CITY_LABEL_MIN_ZOOM && (
                <text
                  y={-4 / zoomScale}
                  textAnchor="middle"
                  fontSize={CITY_LABEL_FONT_SCREEN_PX / zoomScale}
                  strokeWidth={2.2 / zoomScale}
                >
                  {feature.properties.name_en}
                  {CITY_SIZE[feature.id] !== undefined ? `(${CITY_SIZE[feature.id]})` : ''}
                </text>
              )}
            </g>
          ))}
          {unitStacks.map((stack) => {
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
            const glyph = UNIT_GLYPH[stack.units[0].type] ?? '?'
            return (
              <g
                key={stack.key}
                className={classes.join(' ')}
                transform={`translate(${stack.x}, ${stack.y}) scale(${1 / zoomScale}) translate(${stack.offsetX}, 12)`}
                onClick={(event) => handleStackClick(stack, event)}
              >
                <rect x={-10} y={-7} width={20} height={14} rx={2} className="stack-body" />
                <rect x={-10} y={-7} width={4} height={14} rx={1} className="stack-stripe" />
                <text x={-2.5} y={3.5} textAnchor="middle" className="stack-glyph">
                  {glyph}
                </text>
                <circle cx={10} cy={-7} r={5.5} className="stack-count-bg" />
                <text x={10} y={-4.5} textAnchor="middle" className="stack-count">
                  {stack.units.length}
                </text>
              </g>
            )
          })}
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

      {selected && selectedState && selectedState.isCity && (
        <CityPanel
          province={selectedState}
          fogged={Boolean(visibleProvinces && !visibleProvinces.has(selected.id))}
          onClose={() => setSelectedId(null)}
          onSelectProvince={setSelectedId}
        />
      )}

      {selected && selectedState && !selectedState.isCity && (
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
        </div>
      )}

      {selectedStack && (
        <p className="move-hint move-hint-floating">
          Pile de {selectedStack.units.length} sélectionnée — cliquez une destination n'importe où sur la carte
          (Échap pour annuler).
          {selectedStack.units.some((u) => movingUnitIds.has(u.id)) && (
            <button
              type="button"
              className="move-stop-btn"
              onClick={() => {
                for (const unit of selectedStack.units) stopUnit(unit.id)
                setSelectedStackKey(null)
              }}
            >
              ■ Stopper
            </button>
          )}
        </p>
      )}
    </div>
  )
}
