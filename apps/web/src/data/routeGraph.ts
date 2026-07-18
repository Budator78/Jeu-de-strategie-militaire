import { Delaunay } from 'd3-delaunay'
import { geoCentroid, geoDistance } from 'd3-geo'
import type { ProvinceFeature } from './geoData'

/**
 * The route network troops travel. Rather than wiring every province to all
 * its neighbours with direct lines (which clumps up in dense regions and
 * leaves gaps elsewhere), we build a Delaunay triangulation of the province
 * centres: a planar, even web where each province connects only to the ones
 * around it, and everywhere else is reached THROUGH that web — like the source
 * game's map. Land borders are merged in so no real neighbour is lost, and any
 * province the pruning would strand keeps a lifeline to its nearest node.
 *
 * The result feeds both the engine (province.neighbors → movement/pathfinding)
 * and the drawn network, so the graph you see is the graph troops travel.
 */

const EARTH_KM = 6371
// Drop Delaunay edges longer than this (ocean-spanning triangle sides), so the
// web stays regional — coasts and islands link across seas, not across oceans.
const MAX_EDGE_KM = 1500

export interface RouteGraph {
  adjacency: Record<string, string[]>
}

export function buildRouteGraph(
  features: ProvinceFeature[],
  landAdjacency: Record<string, string[]>,
): RouteGraph {
  const ids = features.map((f) => f.id)
  const points = features.map((f) => geoCentroid(f as never) as [number, number])
  const kmBetween = (a: number, b: number) => geoDistance(points[a], points[b]) * EARTH_KM

  const adj = new Map<string, Set<string>>()
  for (let i = 0; i < ids.length; i++) adj.set(ids[i], new Set(landAdjacency[ids[i]] ?? []))

  // Delaunay over the province centres (lon/lat plane) — an even, planar web.
  const delaunay = Delaunay.from(points)
  const { triangles } = delaunay
  const addEdge = (a: number, b: number) => {
    if (kmBetween(a, b) > MAX_EDGE_KM) return
    adj.get(ids[a])!.add(ids[b])
    adj.get(ids[b])!.add(ids[a])
  }
  for (let t = 0; t < triangles.length; t += 3) {
    const a = triangles[t]
    const b = triangles[t + 1]
    const c = triangles[t + 2]
    addEdge(a, b)
    addEdge(b, c)
    addEdge(c, a)
  }

  // Lifeline: never strand a province — tie any isolated one to its nearest.
  for (let i = 0; i < ids.length; i++) {
    if (adj.get(ids[i])!.size > 0) continue
    let best = -1
    let bestKm = Infinity
    for (let j = 0; j < ids.length; j++) {
      if (i === j) continue
      const km = kmBetween(i, j)
      if (km < bestKm) {
        bestKm = km
        best = j
      }
    }
    if (best >= 0) {
      adj.get(ids[i])!.add(ids[best])
      adj.get(ids[best])!.add(ids[i])
    }
  }

  const adjacency: Record<string, string[]> = {}
  for (const id of ids) adjacency[id] = [...adj.get(id)!]
  return { adjacency }
}
