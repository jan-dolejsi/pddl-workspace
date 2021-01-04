/* --------------------------------------------------------------------------------------------
* Copyright (c) Jan Dolejsi. All rights reserved.
* Licensed under the MIT License. See License.txt in the project root for license information.
* ------------------------------------------------------------------------------------------ */

/**
 * Simple directional graph.
 */
export class DirectionalGraph {
    // vertices and edges stemming from them
    private verticesAndEdges: [string, string[]][] = [];

    /**
     * Constructor, optionally copy-constructor.
     * @param verticesAndEdges optional list of vertex-edges tuples - use as a copy constructor to re-hydrate from de-serialized object
     */
    constructor(verticesAndEdges?: [string, string[]][]) {
        if (verticesAndEdges) {
            this.verticesAndEdges = verticesAndEdges;
        }
    }

    static fromGraph(graph: DirectionalGraph): DirectionalGraph {
        return new DirectionalGraph(graph.verticesAndEdges);
    }

    /**
     * Get all vertices.
     */
    getVertices(): string[] {
        return this.verticesAndEdges.map(tuple => tuple[0]);
    }
    /**
     * Get all edges.
     */
    getEdges(): [string, string][] {
        const edges: [string, string][] = [];
        this.verticesAndEdges.forEach(vertexEdges => {
            const fromVertex = vertexEdges[0];
            const connectedVertices = vertexEdges[1];
            connectedVertices.forEach(toVertex => edges.push([fromVertex, toVertex]));
        });
        return edges;
    }
    addEdge(from: string, to?: string): DirectionalGraph {
        const fromVertex = this.verticesAndEdges.find(vertex => vertex[0] === from);
        if (fromVertex) {
            const edgesAlreadyInserted = fromVertex[1];
            if (to && !edgesAlreadyInserted.includes(to)) {
                edgesAlreadyInserted.push(to);
            }
        }
        else {
            const edges = to ? [to] : [];
            this.verticesAndEdges.push([from, edges]);
        }
        if (to) {
            this.addEdge(to, undefined);
        }
        return this;
    }
    getVerticesWithEdgesFrom(vertex: string): string[] | undefined {
        const verticesFound = this.verticesAndEdges.find(t => t[0] === vertex);
        return verticesFound ? verticesFound[1] : undefined;
    }
    getVerticesWithEdgesTo(vertex: string): string[] {
        return this.verticesAndEdges
            .filter(t => t[1].includes(vertex))
            .map(t => t[0]);
    }
    getSubtreePointingTo(vertex: string): string[] {
        const vertices = this.getVerticesWithEdgesTo(vertex);
        const verticesSubTree = vertices
            .map(childVertex => this.getSubtreePointingTo(childVertex))
            .reduce((x, y) => x.concat(y), []);
        return vertices.concat(verticesSubTree);
    }
    getSubtreePointingFrom(vertex: string): string[] {
        const vertices = this.getVerticesWithEdgesFrom(vertex);
        if (!vertices) { return []; }
        const verticesSubTree = vertices
            .map(childVertex => this.getSubtreePointingFrom(childVertex))
            .reduce((x, y) => x.concat(y), []);
        return vertices.concat(verticesSubTree);
    }
}