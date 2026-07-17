import { feature } from 'topojson-client'
import { buildAdjacency, type Topology } from '@con/engine'
import topologyRaw from './geo/world.topojson?raw'
import { buildSeaRoutes } from './seaRoutes'

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

/** Land adjacency from shared TopoJSON arcs, before sea routes are added. */
const landAdjacency = buildAdjacency(topology, OBJECT_NAME)

// Add naval routes so islands are reachable and troops can cross water.
const seaRoutes = buildSeaRoutes(provinceFeatures, landAdjacency)

/** province id -> neighboring province ids (land borders + sea crossings). */
export const adjacency = seaRoutes.adjacency

/** "idA|idB" (sorted) for every link that is a sea crossing, for map styling. */
export const seaPairs = seaRoutes.seaPairs
