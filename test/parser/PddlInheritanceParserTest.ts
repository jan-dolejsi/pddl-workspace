/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as assert from 'assert';
import { DirectionalGraph } from '../utils/src';
import { PddlInheritanceParser } from './src';

describe('PddlInheritanceParser', () => {

    describe('#parseInheritance', () => {
        it('should parse empty declaration', () => {
            const graph = PddlInheritanceParser.parseInheritance('');
            assert.equal(0, graph.getVertices().length);
        });

        it('should parse single type declaration', () => {
            const typeName = 'type1';
            const graph = PddlInheritanceParser.parseInheritance(typeName);
            assert.ok(graph.getVertices().includes(typeName), 'should include type1');
            assert.ok(graph.getVertices().includes(PddlInheritanceParser.OBJECT), 'should include object');
        });

        it('should parse single type declaration with a dash', () => {
            const typeName = 'basic-type1';
            const graph = PddlInheritanceParser.parseInheritance(typeName);
            assert.ok(graph.getVertices().includes(typeName), 'should include basic-type1');
        });

        it('should parse two type declarations', () => {
            const typeName1 = 'type1';
            const typeName2 = 'type2';
            const graph = PddlInheritanceParser.parseInheritance(`${typeName1} ${typeName2}`);
            assert.ok(graph.getVertices().includes(typeName1), 'should include type1');
            assert.ok(graph.getVertices().includes(typeName2), 'should include type2');
        });

        it('should parse parent-child declarations', () => {
            const parent = 'parent';
            const child = 'child';
            const graph = PddlInheritanceParser.parseInheritance(`${child} - ${parent}`);
            assert.ok(graph.getVertices().includes(parent), 'should include parent');
            assert.ok(graph.getVertices().includes(child), 'should include child');
            assert.ok(graph.getVerticesWithEdgesFrom(child)?.includes(parent), 'child should have parent');
            assert.deepStrictEqual(graph.getVerticesWithEdgesFrom(parent), [PddlInheritanceParser.OBJECT], 'parent should not have parent');
        });

        it('should parse parent-child declarations with new line', () => {
            const parent = 'parent';
            const child = 'child';
            const graph = PddlInheritanceParser.parseInheritance(child + "\n- " + parent);
            assert.ok(graph.getVertices().includes(parent), 'should include parent');
            assert.ok(graph.getVertices().includes(child), 'should include child');
            assert.ok(graph.getVerticesWithEdgesFrom(child)?.includes(parent), 'child should have parent');
            assert.deepStrictEqual(graph.getVerticesWithEdgesFrom(parent), [PddlInheritanceParser.OBJECT], 'parent should not have parent');
        });

        it('should parse parent-2children declarations', () => {
            const parent = 'parent';
            const child1 = 'child1';
            const child2 = 'child2';
            const graph = PddlInheritanceParser.parseInheritance(`${child1} ${child2} - ${parent}`);
            assert.ok(graph.getVertices().includes(parent), 'should include parent');
            assert.ok(graph.getVertices().includes(child1), 'should include child1');
            assert.ok(graph.getVertices().includes(child2), 'should include child2');
            assert.ok(graph.getVerticesWithEdgesFrom(child1)?.includes(parent), 'child1 should have parent');
            assert.ok(graph.getVerticesWithEdgesFrom(child2)?.includes(parent), 'child2 should have parent');
            assert.deepStrictEqual(graph.getVerticesWithEdgesFrom(parent), [PddlInheritanceParser.OBJECT], 'parent should not have parent');
        });

        it('should parse parent-child and orphan declarations', () => {
            const parent = 'parent';
            const child = 'child';
            const orphan = 'orphan';
            const graph = PddlInheritanceParser.parseInheritance(`${child} - ${parent} ${orphan}`);
            assert.ok(graph.getVertices().includes(parent), 'should include parent');
            assert.ok(graph.getVertices().includes(child), 'should include child');
            assert.ok(graph.getVertices().includes(orphan), 'should include orphan');

            assert.ok(graph.getVerticesWithEdgesFrom(child)?.includes(parent), 'child should have parent');
            assert.deepStrictEqual(graph.getVerticesWithEdgesFrom(parent), [PddlInheritanceParser.OBJECT], 'parent should not have parent');
            assert.deepStrictEqual(graph.getVerticesWithEdgesFrom(orphan), [PddlInheritanceParser.OBJECT], 'orphan should not have "object" parent');
        });

        it('should parse 2 parent-child declarations', () => {
            const parent1 = 'parent1';
            const child1 = 'child1';
            const parent2 = 'parent2';
            const child2 = 'child2';
            const graph = PddlInheritanceParser.parseInheritance(`${child1} - ${parent1} ${child2} - ${parent2}`);
            assert.ok(graph.getVerticesWithEdgesFrom(child1)?.includes(parent1), 'child1 should have parent1');
            assert.ok(graph.getVerticesWithEdgesFrom(child2)?.includes(parent2), 'child2 should have parent2');
            assert.ok(graph.getVerticesWithEdgesFrom(parent1)?.includes(PddlInheritanceParser.OBJECT), 'parent1 should inherit from object');
            assert.ok(graph.getVerticesWithEdgesFrom(parent2)?.includes(PddlInheritanceParser.OBJECT), 'parent2 should inherit from object');
        });

        it('should parse 2 children of same parent separate declarations', () => {
            const parent1 = 'parent1';
            const child1 = 'child1';
            const child2 = 'child2';
            const graph = PddlInheritanceParser.parseInheritance(`${child1} - ${parent1} ${child2} - ${parent1}`);
            assert.ok(graph.getVerticesWithEdgesFrom(child1)?.includes(parent1), 'child1 should have parent1');
            assert.ok(graph.getVerticesWithEdgesFrom(child2)?.includes(parent1), 'child2 should have parent1');
            assert.ok(graph.getVerticesWithEdgesFrom(parent1)?.includes(PddlInheritanceParser.OBJECT), 'parent1 should inherit from object');
        });

        it('should parse multiple children of the same parent', () => {
            const parent1 = 'stage';
            const child1 = 'stage8';
            const child2 = 'stage11';
            const graph = PddlInheritanceParser.parseInheritance(`stage1 - stage
            stage11 - stage
            stage4 - stage
            stage5 - stage
            stage7 - stage
            stage8 - stage
            stage9 - stage
            qp-02 - mast
            je32 - mast
            d2 - drill
            swt3 - swt
            swt2 - swt
            `);
            assert.ok(graph.getVerticesWithEdgesFrom(child1)?.includes(parent1), 'child1 should have parent1');
            assert.ok(graph.getVerticesWithEdgesFrom(child2)?.includes(parent1), 'child2 should have parent1');
            assert.ok(graph.getVerticesWithEdgesFrom(parent1)?.includes(PddlInheritanceParser.OBJECT), 'parent1 should inherit from object');
            assert.ok(graph.getVerticesWithEdgesTo(parent1).length == 7, '7 stages');
        });
    });

    describe('#toTypeObjects', () => {
        it('should form object-type map', () => {
            const type1 = "type1";
            const object1 = "object1";
            const graph = new DirectionalGraph();
            graph.addEdge(object1, type1);

            const typeObjects = PddlInheritanceParser.toTypeObjects(graph);

            assert.strictEqual(typeObjects.length, 1, 'there should be 1 type');
            const type1ObjectsMap = typeObjects.getTypeCaseInsensitive(type1);
            assert.ok(type1ObjectsMap !== undefined, 'the type should be type1');
            assert.strictEqual(type1ObjectsMap?.getObjects().length, 1, 'the # of objects should be 1');
            assert.strictEqual(type1ObjectsMap?.getObjects()[0], object1, 'the object should be object1');
        });

        it('should form 2object-type map', () => {
            const type1 = "type1";
            const object1 = "object1";
            const object2 = "object2";
            const graph = new DirectionalGraph();
            graph.addEdge(object1, type1);
            graph.addEdge(object2, type1);

            const typeObjects = PddlInheritanceParser.toTypeObjects(graph);

            assert.strictEqual(typeObjects.length, 1, 'there should be 1 type');
            const type1ObjectsMap = typeObjects.getTypeCaseInsensitive(type1);
            assert.ok(type1ObjectsMap !== undefined, 'the type should be type1');
            assert.ok(type1ObjectsMap?.hasObject(object1), 'the object should be object1');
            assert.ok(type1ObjectsMap?.hasObject(object2), 'the object should be object2');
        });
    });
});