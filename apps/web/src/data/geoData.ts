import { feature } from 'topojson-client'
import { buildAdjacency, type Topology } from '@con/engine'
import topologyRaw from './geo/world.topojson?raw'

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

/** province id -> neighboring province ids, derived from shared TopoJSON arcs */
export const adjacency = buildAdjacency(topology, OBJECT_NAME)
