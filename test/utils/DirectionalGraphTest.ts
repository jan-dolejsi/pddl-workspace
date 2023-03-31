/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { DirectionalGraph } from './src';
import { describe, it, expect, beforeEach } from 'vitest';

describe('DirectionalGraph', () => {
    let graph: DirectionalGraph;
    beforeEach(() => {
        graph = new DirectionalGraph();
    });

    describe('#addEdge', () => {
        it('should add one edge', () => {
            // given
            const origin = 'origin';
            const target = 'target';

            // when
            graph.addEdge(origin, target);

            // then
            expect(graph.getEdges()).to.have.length(1);
            expect(graph.getVertices()).to.have.length(2);
            expect(graph.getVertices()).to.includes(origin);
            expect(graph.getVertices()).to.include(target);
            expect(graph.getEdges()[0][0]).to.equal(origin, "the edge should originate from the origin vertex");
            expect(graph.getEdges()[0][1]).to.equal(target, "the edge should target the target vertex");
        });

        it('should add two edges from the same origin', () => {
            // given
            const origin = 'origin';
            const target1 = 'target1';
            const target2 = 'target2';
            
            // when
            graph.addEdge(origin, target1);
            graph.addEdge(origin, target2);
            
            // then
            expect(graph.getEdges()).to.have.length(2);
            expect(graph.getVertices()).to.have.length(3);
            expect(graph.getVertices()).to.include(origin);
            expect(graph.getVertices()).to.include(target1);
            expect(graph.getVertices()).to.include(target1);
            expect(graph.getEdges().map(e => e[0])).to.deep.equal([origin, origin], "the edges should originate from the origin vertex");
            expect(graph.getEdges().map(e => e[1])).to.include(target1, "the edge should target the target1 vertex");
            expect(graph.getEdges().map(e => e[1])).to.include(target2, "the edge should target the target2 vertex");
        });

        it('should add two edges to the same target', () => {
            // given
            const origin1 = 'origin1';
            const origin2 = 'origin2';
            const target = 'target';
            
            // when
            graph.addEdge(origin1, target);
            graph.addEdge(origin2, target);
            
            // then
            expect(graph.getEdges()).to.have.length(2);
            expect(graph.getVertices()).to.have.length(3);
            expect(graph.getVertices()).to.include(origin1);
            expect(graph.getVertices()).to.include(origin2);
            expect(graph.getVertices()).to.include(target);
            expect(graph.getEdges().map(e => e[0])).to.include(origin1, "an edge should originate from the origin1 vertex");
            expect(graph.getEdges().map(e => e[0])).to.include(origin2, "an edge should originate from the origin2 vertex");
            expect(graph.getEdges().map(e => e[1])).to.deep.equal([target, target], "the edges should target the target vertex");
        });
    });
    
    describe('#getVerticesWithEdgesFrom', () => {
        it('should return one vertex with edge from origin', () => {
            // given
            const origin = 'origin';
            const target = 'target';
            graph.addEdge(origin, target);

            // when
            const targets = graph.getVerticesWithEdgesFrom(origin);

            // then
            expect(targets).to.not.be.undefined;;
            expect(targets).to.have.length(1);
            expect(targets?.[0]).to.equal(target);
        });

        it('should return no vertices with edge from target', () => {
            // given
            const origin = 'origin';
            const target = 'target';
            graph.addEdge(origin, target);

            // when
            const targets = graph.getVerticesWithEdgesFrom(target);

            // then
            expect(targets).to.have.length(0);
        });
    });

    describe('#getVerticesWithEdgesTo', () => {
        it('should return one vertex with edge to target', () => {
            // given
            const origin = 'origin';
            const target = 'target';
            graph.addEdge(origin, target);

            // when
            const origins = graph.getVerticesWithEdgesTo(target);

            // then
            expect(origins).to.have.length(1);
            expect(origins[0]).to.equal(origin);
        });

        it('should return no vertices with edge to origin', () => {
            // given
            const origin = 'origin';
            const target = 'target';
            graph.addEdge(origin, target);

            // when
            const targets = graph.getVerticesWithEdgesTo(origin);

            // then
            expect(targets).to.have.length(0);
        });
    });
    
    describe('#getSubtreePointingTo', () => {
        it('should return one vertex as subtree pointing to target', () => {
            // given
            const origin = 'origin';
            const target = 'target';
            graph.addEdge(origin, target);

            // when
            const originSubTree = graph.getSubtreePointingTo(target);

            // then
            expect(originSubTree).to.have.length(1);
            expect(originSubTree[0]).to.equal(origin);
        });

        it('should return child as subtree pointing to parent', () => {
            // given
            const child = 'child';
            const parent = 'parent';
            const grandparent = 'grandparent';
            graph.addEdge(child, parent);
            graph.addEdge(parent, grandparent);
            
            // when
            const originSubTree = graph.getSubtreePointingTo(parent);

            // then
            expect(originSubTree).to.have.length(1);
            expect(originSubTree[0]).to.equal(child);
        });

        it('should return child and parent as subtree pointing to grandparent', () => {
            // given
            const child = 'child';
            const parent = 'parent';
            const grandparent = 'grandparent';
            graph.addEdge(child, parent);
            graph.addEdge(parent, grandparent);
            
            // when
            const originSubTree = graph.getSubtreePointingTo(grandparent);

            // then
            expect(originSubTree).to.have.length(2);
            expect(originSubTree).to.include(child, "should include child");
            expect(originSubTree).to.include(parent, "should include parent");
        });
    });
    
    describe('#getSubtreePointingFrom', () => {
        it('should return one vertex as subtree pointing from origin', () => {
            // given
            const origin = 'origin';
            const target = 'target';
            graph.addEdge(origin, target);

            // when
            const targetSubTree = graph.getSubtreePointingFrom(origin);

            // then
            expect(targetSubTree).to.have.length(1);
            expect(targetSubTree[0]).to.equal(target);
        });

        it('should return grandparent as subtree pointing from parent', () => {
            // given
            const child = 'child';
            const parent = 'parent';
            const grandparent = 'grandparent';
            graph.addEdge(child, parent);
            graph.addEdge(parent, grandparent);
            
            // when
            const originSubTree = graph.getSubtreePointingFrom(parent);

            // then
            expect(originSubTree).to.have.length(1);
            expect(originSubTree[0]).to.equal(grandparent);
        });

        it('should return parent and grandparent as subtree pointing from child', () => {
            // given
            const child = 'child';
            const parent = 'parent';
            const grandparent = 'grandparent';
            graph.addEdge(child, parent);
            graph.addEdge(parent, grandparent);
            
            // when
            const originSubTree = graph.getSubtreePointingFrom(child);

            // then
            expect(originSubTree).to.have.length(2);
            expect(originSubTree).to.include(grandparent, "should include grandparent");
            expect(originSubTree).to.include(parent, "should include parent");
        });
    });
});