import { feature } from 'topojson-client'
import { buildAdjacency, type Topology } from '@con/engine'
import topologyRaw from './geo/world.topojson?raw'
import { buildRouteGraph, detectCoastal } from './routeGraph'

export const OBJECT_NAME = 'provinces'

export interface ProvinceProperties {
  id: string
  name: string
  name_en: string
  adm0_a3: string
  type_en: string
}

export interface ProvinceFeature {
  type: 'Feature'
  id: string
  properties: ProvinceProperties
  geometry: GeoJSON.Geometry
}

export const topology = JSON.parse(topologyRaw) as Topology

export const featureCollection = feature(
  topology as never,
  topology.objects[OBJECT_NAME] as never,
) as unknown as { type: 'FeatureCollection'; features: ProvinceFeature[] }

export const provinceFeatures = featureCollection.features

/** Land adjacency from shared TopoJSON arcs, before the route web is built. */
const landAdjacency = buildAdjacency(topology, OBJECT_NAME)

/** Provinces on a real coastline (they can host ports). */
export const coastalIds = detectCoastal(topology, OBJECT_NAME)

// Land borders + maritime lanes between coastal ports.
const routeGraph = buildRouteGraph(provinceFeatures, landAdjacency, coastalIds)

/** province id -> neighboring province ids (land + sea network). */
export const adjacency = routeGraph.adjacency

/** Drawn route layers: land borders and port-to-port sea lanes. */
export const landRouteEdges = routeGraph.landEdges
export const seaRouteEdges = routeGraph.seaEdges

/** Provinces that host a port (endpoints of sea lanes). */
export const portIds = routeGraph.portIds
