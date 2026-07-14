import { neighbors } from "topojson-client";

export interface TopologyGeometry {
  id?: string | number;
  type: string;
  arcs?: unknown;
}

export interface TopologyObject {
  type: string;
  geometries: TopologyGeometry[];
}

export interface Topology {
  type: "Topology";
  arcs: number[][][];
  objects: Record<string, TopologyObject>;
}

/** Maps province id -> neighboring province ids, derived from shared TopoJSON arcs. */
export function buildAdjacency(
  topology: Topology,
  objectName: string,
): Record<string, string[]> {
  const object = topology.objects[objectName];
  if (!object) {
    throw new Error(`Object "${objectName}" not found in topology`);
  }

  const geometries = object.geometries;
  const neighborIndexes = neighbors(geometries as never);

  const adjacency: Record<string, string[]> = {};
  geometries.forEach((geometry, index) => {
    const id = String(geometry.id);
    adjacency[id] = (neighborIndexes[index] ?? []).map((neighborIndex) =>
      String(geometries[neighborIndex].id),
    );
  });
  return adjacency;
}
