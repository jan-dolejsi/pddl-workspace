/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { ProblemInfo, DocumentPositionResolver } from './src';
import { Variable, Parameter, ObjectInstance } from './src';
import * as assert from 'assert';
import { Grounder } from './src';
import { PddlSyntaxTree } from './parser/src';
import { SimpleDocumentPositionResolver } from './src';
import { DomainInfo, TypeObjectMap } from './src';
import { DirectionalGraph } from './utils/src';
import { URI } from 'vscode-uri';

function createPositionResolver(): DocumentPositionResolver {
    return new SimpleDocumentPositionResolver('');
}

describe('Grounder', () => {

    describe('#ground', () => {
        it('grounds un-parameterized variable', () => {
            // GIVEN            
            const domain = new DomainInfo(URI.parse("file:///fake"), 1, "domain1", PddlSyntaxTree.EMPTY, createPositionResolver());
            const problem = new ProblemInfo(URI.parse("file:///fake"), 1, "problem1", "domain1", PddlSyntaxTree.EMPTY, createPositionResolver());
            const liftedVariable = new Variable("cost", []);

            // WHEN
            const groundedVariables = new Grounder(domain, problem).ground(liftedVariable);

            assert.equal(groundedVariables.length, 1);
        });

        it('grounds 1-parameterized variable with no objects', () => {
            // GIVEN            
            const domain = new DomainInfo(URI.parse("file:///fake"), 1, "domain1", PddlSyntaxTree.EMPTY, createPositionResolver());
            const problem = new ProblemInfo(URI.parse("file:///fake"), 1, "problem1", "domain1", PddlSyntaxTree.EMPTY, createPositionResolver());
            domain.setTypeInheritance(new DirectionalGraph().addEdge("type1", "object"));
            const liftedVariable = new Variable("cost", [new Parameter("p1", "type1")]);

            // WHEN
            const groundedVariables = new Grounder(domain, problem).ground(liftedVariable);

            assert.equal(groundedVariables.length, 0);
        });

        it('grounds 1-parameterized variable with one object', () => {
            // GIVEN            
            const domain = new DomainInfo(URI.parse("file:///fake"), 1, "domain1", PddlSyntaxTree.EMPTY, createPositionResolver());
            const problem = new ProblemInfo(URI.parse("file:///fake"), 1, "problem1", "domain1", PddlSyntaxTree.EMPTY, createPositionResolver());
            const type1 = "type1";
            const object1 = "object1";
            problem.setObjects(new TypeObjectMap().addAll(type1, [object1]));
            const liftedVariable = new Variable("cost", [new Parameter("p1", type1)]);

            // WHEN
            const groundedVariables = new Grounder(domain, problem).ground(liftedVariable);

            assert.equal(groundedVariables.length, 1, "there should be 1 grounded variable");
            assert.equal(groundedVariables[0].parameters.length, 1, "the grounded variable should have 1 parameter");
            assert.equal((groundedVariables[0].parameters[0] as ObjectInstance).name, object1);
        });

        it('grounds 1-parameterized variable with one child-type object', () => {
            // GIVEN            
            const domain = new DomainInfo(URI.parse("file:///fake"), 1, "domain1", PddlSyntaxTree.EMPTY, createPositionResolver());
            const problem = new ProblemInfo(URI.parse("file:///fake"), 1, "problem1", "domain1", PddlSyntaxTree.EMPTY, createPositionResolver());
            const parent = "parent";
            const child = "child";
            const object1 = "object1";
            domain.setTypeInheritance(new DirectionalGraph().addEdge("child", "parent"));
            problem.setObjects(new TypeObjectMap().add(child, object1));
            const liftedVariable = new Variable("cost", [new Parameter("p1", parent)]);

            // WHEN
            const groundedVariables = new Grounder(domain, problem).ground(liftedVariable);

            assert.equal(groundedVariables.length, 1, "there should be 1 grounded variable");
            assert.equal(groundedVariables[0].parameters.length, 1, "the grounded variable should have 1 parameter");
            assert.equal((groundedVariables[0].parameters[0] as ObjectInstance).name, object1);
        });

        it('grounds 1-parameterized variable with two objects', () => {
            // GIVEN            
            const domain = new DomainInfo(URI.parse("file:///fake"), 1, "domain1", PddlSyntaxTree.EMPTY, createPositionResolver());
            const problem = new ProblemInfo(URI.parse("file:///fake"), 1, "problem1", "domain1", PddlSyntaxTree.EMPTY, createPositionResolver());
            const type1 = "type1";
            const object1 = "object1";
            const object2 = "object2";
            problem.setObjects(new TypeObjectMap().addAll(type1, [object1, object2]));
            const liftedVariable = new Variable("cost", [new Parameter("p1", type1)]);

            // WHEN
            const groundedVariables = new Grounder(domain, problem).ground(liftedVariable);

            assert.equal(groundedVariables.length, 2, "there should be 2 grounded variables");
        });

        it('grounds 2-parameterized variable with two objects', () => {
            // GIVEN            
            const domain = new DomainInfo(URI.parse("file:///fake"), 1, "domain1", PddlSyntaxTree.EMPTY, createPositionResolver());
            const problem = new ProblemInfo(URI.parse("file:///fake"), 1, "problem1", "domain1", PddlSyntaxTree.EMPTY, createPositionResolver());
            const type1 = "type1";
            const object1 = "object1";
            const object2 = "object2";
            problem.setObjects(new TypeObjectMap().addAll(type1, [object1, object2]));
            const liftedVariable = new Variable("cost", [new Parameter("p1", type1), new Parameter("p2", type1)]);

            // WHEN
            const groundedVariables = new Grounder(domain, problem).ground(liftedVariable);

            assert.equal(groundedVariables.length, 4, "there should be N grounded variables");
        });
    });

    describe('#getObjects', () => {
        it('get objects for 1 type', () => {
            // GIVEN
            const domain = new DomainInfo(URI.parse("file:///fake"), 1, "domain1", PddlSyntaxTree.EMPTY, createPositionResolver());
            const problem = new ProblemInfo(URI.parse("file:///fake"), 1, "problem1", "domain1", PddlSyntaxTree.EMPTY, createPositionResolver());
            const type1 = "type1";
            const object1 = "object1";
            const object2 = "object2";
            problem.setObjects(new TypeObjectMap().addAll(type1, [object1, object2]));
            domain.setTypeInheritance(new DirectionalGraph().addEdge(type1, "object"));

            // WHEN
            const objects = new Grounder(domain, problem).getObjects([type1]);

            // THEN
            assert.strictEqual(objects.length, 1, "there should be 1 set of objects for 1 type");
            assert.deepStrictEqual(objects[0], [object1, object2], "there should be 2 objects for 1 type");
        });

        it('get objects for 2 types', () => {
            // GIVEN            
            const domain = new DomainInfo(URI.parse("file:///fake"), 1, "domain1", PddlSyntaxTree.EMPTY, createPositionResolver());
            const problem = new ProblemInfo(URI.parse("file:///fake"), 1, "problem1", "domain1", PddlSyntaxTree.EMPTY, createPositionResolver());

            const type1 = "type1";
            const type1object1 = "t1object1";
            const type1object2 = "t1object2";

            const type2 = "type2";
            const type2object1 = "t2object1";
            const type2object2 = "t2object2";

            problem.setObjects(new TypeObjectMap()
                .addAll(type1, [type1object1, type1object2])
                .addAll(type2, [type2object1, type2object2])
            );

            // WHEN
            const objects = new Grounder(domain, problem).getObjects([type1, type2]);

            assert.equal(objects.length, 2, "there should be 2 sets of objects for 2 types");
            assert.deepEqual(objects[0], [type1object1, type1object2], "there should be 2 objects for type1");
            assert.deepEqual(objects[1], [type2object1, type2object2], "there should be 2 objects for type2");
        });
    });

    describe('#getObjectPermutations', () => {
        it('get object permutations for 1 type', () => {
            // GIVEN            
            const domain = new DomainInfo(URI.parse("file:///fake"), 1, "domain1", PddlSyntaxTree.EMPTY, createPositionResolver());
            const problem = new ProblemInfo(URI.parse("file:///fake"), 1, "problem1", "domain1", PddlSyntaxTree.EMPTY, createPositionResolver());
            const type1 = "type1";
            const object1 = "object1";
            const object2 = "object2";
            problem.setObjects(new TypeObjectMap().addAll(type1, [object1, object2]));

            // WHEN
            const objects = new Grounder(domain, problem).getObjectPermutations([type1]);

            assert.equal(objects.length, 2, "there should be 2 permutations");
            assert.deepEqual(objects, [[object1], [object2]]);
        });

        it('get object permutations for 2 types', () => {
            // GIVEN            
            const domain = new DomainInfo(URI.parse("file:///fake"), 1, "domain1", PddlSyntaxTree.EMPTY, createPositionResolver());
            const problem = new ProblemInfo(URI.parse("file:///fake"), 1, "problem1", "domain1", PddlSyntaxTree.EMPTY, createPositionResolver());

            const type1 = "type1";
            const type1object1 = "t1object1";
            const type1object2 = "t1object2";

            const type2 = "type2";
            const type2object1 = "t2object1";
            const type2object2 = "t2object2";

            problem.setObjects(new TypeObjectMap()
                .addAll(type1, [type1object1, type1object2])
                .addAll(type2, [type2object1, type2object2])
            );

            // WHEN
            assert.throws(() => {
                const objects = new Grounder(domain, problem).getObjectPermutations([type1, type2]);

                assert.equal(objects.length, 2, "there should be 2 sets of objects for 2 types");
                assert.deepEqual(objects[0], [type1object1, type1object2], "there should be 2 objects for type1");
                assert.deepEqual(objects[1], [type2object1, type2object2], "there should be 2 objects for type2");
            });
        });
    });
});
