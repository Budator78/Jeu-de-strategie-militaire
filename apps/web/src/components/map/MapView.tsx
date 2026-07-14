import { useEffect, useMemo, useRef, useState } from 'react'
import { geoNaturalEarth1, geoPath } from 'd3-geo'
import { select } from 'd3-selection'
import { zoom, type D3ZoomEvent } from 'd3-zoom'
import { mesh } from 'topojson-client'
import type { Unit } from '@con/engine'
import { adjacency, featureCollection, provinceFeatures, topology, OBJECT_NAME } from '../../data/geoData'
import { HUMAN_COUNTRY_ID, useGameStore } from '../../state/gameStore'
import { CITY_SIZE } from '../../state/scenario'
import { UnitBuildPanel } from '../hud/UnitBuildPanel'
import './MapView.css'

const WIDTH = 900
const HEIGHT = 700
const UNIT_MARKER_SPACING = 9

const UNIT_GLYPH: Record<string, string> = { infantry: 'I', tank: 'T', fighter: 'F' }

const projection = geoNaturalEarth1().fitSize([WIDTH, HEIGHT], featureCollection as never)
const pathGenerator = geoPath(projection)

interface TopoGeometry {
  id?: string | number
}

export function MapView() {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const gRef = useRef<SVGGElement | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null)
  const provinces = useGameStore((s) => s.state.provinces)
  const countries = useGameStore((s) => s.state.countries)
  const units = useGameStore((s) => s.state.units)
  const queueMove = useGameStore((s) => s.queueMove)

  useEffect(() => {
    if (!svgRef.current || !gRef.current) return
    const svgSelection = select(svgRef.current)
    const gSelection = select(gRef.current)
    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 40])
      .on('zoom', (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
        gSelection.attr('transform', event.transform.toString())
      })
    svgSelection.call(zoomBehavior)
    return () => {
      svgSelection.on('.zoom', null)
    }
  }, [])

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

  const selectedUnit = selectedUnitId ? units[selectedUnitId] : undefined
  const validTargets = useMemo(
    () => (selectedUnit ? new Set(provinces[selectedUnit.provinceId]?.neighbors ?? []) : null),
    [selectedUnit, provinces],
  )

  // Front line: the shared border between two provinces owned by different
  // (non-neutral) countries — approximates "at war" since diplomacy isn't
  // modeled yet, so any two neighboring owners are treated as hostile.
  const frontLinePath = useMemo(() => {
    const frontMesh = mesh(
      topology as never,
      topology.objects[OBJECT_NAME] as never,
      (a: TopoGeometry, b: TopoGeometry | undefined) => {
        if (!b) return false
        const ownerA = provinces[String(a.id)]?.ownerId ?? null
        const ownerB = provinces[String(b.id)]?.ownerId ?? null
        return ownerA !== null && ownerB !== null && ownerA !== ownerB
      },
    )
    return pathGenerator(frontMesh as never) ?? undefined
  }, [provinces])

  const cityLabels = useMemo(
    () =>
      provinceFeatures
        .filter((f) => provinces[f.id]?.isCity)
        .map((f) => ({ feature: f, centroid: pathGenerator.centroid(f as never) })),
    [provinces],
  )

  const unitsByProvince = useMemo(() => {
    const map = new Map<string, Unit[]>()
    for (const unit of Object.values(units)) {
      const list = map.get(unit.provinceId) ?? []
      list.push(unit)
      map.set(unit.provinceId, list)
    }
    return map
  }, [units])

  const unitMarkers = useMemo(
    () =>
      provinceFeatures
        .filter((f) => unitsByProvince.has(f.id))
        .flatMap((f) => {
          const centroid = pathGenerator.centroid(f as never)
          const provinceUnits = unitsByProvince.get(f.id) ?? []
          const startX = centroid[0] - ((provinceUnits.length - 1) * UNIT_MARKER_SPACING) / 2
          return provinceUnits.map((unit, index) => ({
            unit,
            x: startX + index * UNIT_MARKER_SPACING,
            y: centroid[1] + 10,
          }))
        }),
    [unitsByProvince],
  )

  function handleProvinceClick(provinceId: string) {
    if (selectedUnit && validTargets?.has(provinceId)) {
      queueMove(selectedUnit.id, provinceId)
      setSelectedUnitId(null)
      setSelectedId(provinceId)
      return
    }
    setSelectedUnitId(null)
    setSelectedId(provinceId)
  }

  function handleUnitClick(unit: Unit, event: React.MouseEvent) {
    event.stopPropagation()
    setSelectedId(unit.provinceId)
    if (unit.ownerId === HUMAN_COUNTRY_ID) {
      setSelectedUnitId(unit.id)
    } else {
      setSelectedUnitId(null)
    }
  }

  return (
    <div className="map-view">
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
            const ownerId = provinceState?.ownerId ?? null
            const classes = ['province', ownerId ? `owner-${ownerId}` : 'owner-neutral']
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
              <circle r={3.5} />
              <text y={-6} textAnchor="middle">
                {feature.properties.name_en}
                {CITY_SIZE[feature.id] !== undefined ? ` (${CITY_SIZE[feature.id]})` : ''}
              </text>
            </g>
          ))}
          {unitMarkers.map(({ unit, x, y }) => {
            const classes = ['unit-marker', `owner-${unit.ownerId}`]
            if (unit.id === selectedUnitId) classes.push('selected')
            return (
              <g
                key={unit.id}
                className={classes.join(' ')}
                transform={`translate(${x}, ${y})`}
                onClick={(event) => handleUnitClick(unit, event)}
              >
                <rect x={-4} y={-4} width={8} height={8} rx={1.5} />
                <text textAnchor="middle" dy={2.5}>
                  {UNIT_GLYPH[unit.type] ?? '?'}
                </text>
              </g>
            )
          })}
        </g>
      </svg>
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
              <UnitBuildPanel provinceId={selected.id} />
            )}
            {selectedUnit && <p className="move-hint">Select a highlighted province to move there.</p>}
          </>
        ) : (
          <p>Click a province to select it.</p>
        )}
      </aside>
    </div>
  )
}
