import { describe, expect, it } from "vitest";
import { buildAdjacency, type Topology } from "../map/adjacency";

describe("buildAdjacency", () => {
  it("connects provinces that share a TopoJSON arc, and only those", () => {
    const topology: Topology = {
      type: "Topology",
      arcs: [
        [[0, 0], [1, 0]],
        [[1, 0], [1, 1]],
        [[1, 1], [0, 1], [0, 0]],
        [[2, 2], [3, 3]],
      ],
      objects: {
        provinces: {
          type: "GeometryCollection",
          geometries: [
            { id: "A", type: "Polygon", arcs: [[0, 1]] },
            { id: "B", type: "Polygon", arcs: [[~0, 2]] },
            { id: "C", type: "Polygon", arcs: [[3]] },
          ],
        },
      },
    };

    const adjacency = buildAdjacency(topology, "provinces");

    expect(adjacency.A).toEqual(["B"]);
    expect(adjacency.B).toEqual(["A"]);
    expect(adjacency.C).toEqual([]);
  });

  it("throws for an unknown object name", () => {
    const topology: Topology = { type: "Topology", arcs: [], objects: {} };
    expect(() => buildAdjacency(topology, "missing")).toThrow();
  });
});
