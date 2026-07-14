import { useEffect, useMemo, useRef, useState } from 'react'
import { geoNaturalEarth1, geoPath } from 'd3-geo'
import { select } from 'd3-selection'
import { zoom, type D3ZoomEvent, type ZoomBehavior } from 'd3-zoom'
import { mesh } from 'topojson-client'
import type { Unit } from '@con/engine'
import { adjacency, featureCollection, provinceFeatures, topology, OBJECT_NAME } from '../../data/geoData'
import { HUMAN_COUNTRY_ID, useGameStore } from '../../state/gameStore'
import { CITY_SIZE } from '../../state/scenario'
import { BuildUnitModal } from '../hud/BuildUnitModal'
import { ConstructBuildingModal } from '../hud/ConstructBuildingModal'
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

const UNIT_GLYPH: Record<string, string> = { infantry: 'I', tank: 'T', fighter: 'F' }

const projection = geoNaturalEarth1().fitSize([WIDTH, HEIGHT], featureCollection as never)
const pathGenerator = geoPath(projection)

interface TopoGeometry {
  id?: string | number
}

interface UnitStack {
  key: string
  provinceId: string
  ownerId: string
  units: Unit[]
  x: number
  y: number
  /** Horizontal screen-px offset when several owners' stacks share a province. */
  offsetX: number
}

export function MapView() {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const gRef = useRef<SVGGElement | null>(null)
  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedStackKey, setSelectedStackKey] = useState<string | null>(null)
  const [zoomScale, setZoomScale] = useState(1)
  const [buildUnitOpen, setBuildUnitOpen] = useState(false)
  const [constructOpen, setConstructOpen] = useState(false)
  const provinces = useGameStore((s) => s.state.provinces)
  const countries = useGameStore((s) => s.state.countries)
  const units = useGameStore((s) => s.state.units)
  const pendingOrders = useGameStore((s) => s.state.pendingOrders)
  const queueMove = useGameStore((s) => s.queueMove)

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
  const validTargets = useMemo(
    () => (selectedStack ? new Set(provinces[selectedStack.provinceId]?.neighbors ?? []) : null),
    [selectedStack, provinces],
  )

  // Front line: the shared border between two provinces whose owners are at
  // war with each other (see Country.atWarWith).
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
    if (selectedStack && validTargets?.has(provinceId)) {
      // Move the whole stack (each idle unit gets its own order), like the source game's group moves.
      for (const unit of selectedStack.units) {
        if (!movingUnitIds.has(unit.id)) queueMove(unit.id, provinceId)
      }
      setSelectedStackKey(null)
      setSelectedId(provinceId)
      return
    }
    setSelectedStackKey(null)
    setSelectedId(provinceId)
    setBuildUnitOpen(false)
    setConstructOpen(false)
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
      <div className="map-frame">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="map-svg"
          role="img"
          aria-label="Map of provinces"
        >
          <g ref={gRef}>
            {provinceFeatures.map((f) => {
              const provinceState = provinces[f.id]
              const classes = ['province', ownerClass(provinceState?.ownerId ?? null)]
              if (provinceState?.isCity) classes.push('city')
              if (f.id === selectedId) classes.push('selected')
              if (validTargets?.has(f.id)) classes.push('valid-target')
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
            {frontLinePath && <path d={frontLinePath} className="front-line" />}
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
        <div className="zoom-controls">
          <button type="button" onClick={() => zoomBy(1.6)} aria-label="Zoom in">
            +
          </button>
          <button type="button" onClick={() => zoomBy(1 / 1.6)} aria-label="Zoom out">
            −
          </button>
        </div>
      </div>
      <aside className="map-sidebar">
        {selected && selectedState ? (
          <>
            <h2>{selected.properties.name_en}</h2>
            <p className="local-name">{selected.properties.name}</p>
            <p>{selectedState.isCity ? 'City' : 'Province'}</p>
            <p>Owner: {selectedOwner ? selectedOwner.name : 'Unclaimed'}</p>
            <ul className="yields">
              {Object.entries(selectedState.resources).map(([resource, amount]) => (
                <li key={resource}>
                  {resource}: {amount}/min
                </li>
              ))}
            </ul>
            <p>Neighbors: {(adjacency[selected.id] ?? []).length}</p>
            {selectedState.isCity && (
              <p>Buildings: {selectedState.buildings.length > 0 ? selectedState.buildings.join(', ') : 'none'}</p>
            )}
            {unitsInSelectedProvince.length > 0 && (
              <ul className="unit-list">
                {unitsInSelectedProvince.map((u) => (
                  <li key={u.id}>
                    {u.type} ({u.ownerId}) — {Math.round(u.health)} hp
                  </li>
                ))}
              </ul>
            )}
            {selectedState.isCity && selectedState.ownerId === HUMAN_COUNTRY_ID && (
              <div className="production-buttons">
                <button type="button" onClick={() => setBuildUnitOpen(true)}>
                  Build unit
                </button>
                <button type="button" onClick={() => setConstructOpen(true)}>
                  Construct building
                </button>
              </div>
            )}
            {selectedStack && (
              <p className="move-hint">
                Stack of {selectedStack.units.length} selected — click a highlighted province to move it.
              </p>
            )}
          </>
        ) : (
          <p>Click a province to select it.</p>
        )}
      </aside>
      {buildUnitOpen && selected && (
        <BuildUnitModal provinceId={selected.id} onClose={() => setBuildUnitOpen(false)} />
      )}
      {constructOpen && selected && (
        <ConstructBuildingModal provinceId={selected.id} onClose={() => setConstructOpen(false)} />
      )}
    </div>
  )
}
