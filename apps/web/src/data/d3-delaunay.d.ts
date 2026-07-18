// Minimal ambient types for d3-delaunay (the package ships no .d.ts). Only the
// bits used by routeGraph.ts are declared.
declare module 'd3-delaunay' {
  export class Delaunay<P> {
    static from<P>(points: ArrayLike<P>): Delaunay<P>
    triangles: Uint32Array
  }
}
