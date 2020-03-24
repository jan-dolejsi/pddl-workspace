/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as assert from 'assert';
import { Parameter } from '../src';
import { PddlSyntaxTreeBuilder } from './src';
import { SimpleDocumentPositionResolver, PddlRange } from '../src';
import { VariablesParser, parseParameters } from './src';

describe('VariableParser', () => {
    describe('#parsePredicatesOrFunctions', () => {
        it('finds one predicate', () => {
            // GIVEN
            const predicatePddl = `(said_hello)`;
            const predicatesNode = new PddlSyntaxTreeBuilder(predicatePddl).getTree().getRootNode();
            const positionResolver = new SimpleDocumentPositionResolver(predicatePddl);

            // WHEN
            const variables = new VariablesParser(predicatesNode, positionResolver).getVariables();

            assert.equal(variables.length, 1, 'there should be 1 predicate');
            assert.equal(variables[0].getFullName(), "said_hello", 'the predicate name should be...');
            assert.deepStrictEqual(variables[0].getLocation(), new PddlRange(0, 0, 0, predicatePddl.length), 'range');
        });

        it('finds "at" predicate', () => {
            // GIVEN
            const predicatePddl = `(at)`;
            const predicatesNode = new PddlSyntaxTreeBuilder(predicatePddl).getTree().getRootNode();
            const positionResolver = new SimpleDocumentPositionResolver(predicatePddl);

            // WHEN
            const variables = new VariablesParser(predicatesNode, positionResolver).getVariables();

            assert.equal(variables.length, 1, 'there should be 1 predicate');
            assert.equal(variables[0].getFullName(), "at", 'the predicate name should be...');
            assert.deepStrictEqual(variables[0].getLocation(), new PddlRange(0, 0, 0, predicatePddl.length), 'range');
        });

        it('finds 2 predicates without whitespace', () => {
            // GIVEN
            const predicatePddl = `(p1)(p2)`;
            const predicatesNode = new PddlSyntaxTreeBuilder(predicatePddl).getTree().getRootNode();
            const positionResolver = new SimpleDocumentPositionResolver(predicatePddl);

            // WHEN
            const variables = new VariablesParser(predicatesNode, positionResolver).getVariables();

            assert.equal(variables.length, 2, 'there should be 2 predicates');
            assert.equal(variables[0].getFullName(), "p1", 'the predicate name should be...');
            assert.equal(variables[1].getFullName(), "p2", 'the predicate name should be...');
            assert.deepStrictEqual(variables[0].getLocation(), new PddlRange(0, 0, 0, 4), 'p1 range');
            assert.deepStrictEqual(variables[1].getLocation(), new PddlRange(0, 4, 0, predicatePddl.length), 'p2 range');
        });

        it('finds one predicate with one parameter', () => {
            // GIVEN
            const predicatePddl = `(said_hello ?w - world)`;
            const predicatesNode = new PddlSyntaxTreeBuilder(predicatePddl).getTree().getRootNode();
            const positionResolver = new SimpleDocumentPositionResolver(predicatePddl);

            // WHEN
            const variables = new VariablesParser(predicatesNode, positionResolver).getVariables();

            assert.strictEqual(variables.length, 1, 'there should be 1 predicate');
            assert.strictEqual(variables[0].getFullName(), "said_hello ?w - world", 'the predicate name should be...');
            assert.deepStrictEqual(variables[0].parameters, [new Parameter('w', 'world')], 'parameter should be...');
            assert.deepStrictEqual(variables[0].getLocation(), new PddlRange(0, 0, 0, predicatePddl.length), 'range');
        });

        it('finds one function with comment to the right', () => {
            // GIVEN
            const predicatePddl = `(said_hello) ; comment [unit]`;
            const predicatesNode = new PddlSyntaxTreeBuilder(predicatePddl).getTree().getRootNode();
            const positionResolver = new SimpleDocumentPositionResolver(predicatePddl);

            // WHEN
            const variables = new VariablesParser(predicatesNode, positionResolver).getVariables();

            assert.strictEqual(variables.length, 1, 'there should be 1 predicate');
            assert.strictEqual(variables[0].getFullName(), "said_hello", 'the predicate name should be...');
            assert.deepStrictEqual(variables[0].getDocumentation(), ['comment [unit]'], 'documentation should be...');
            assert.strictEqual(variables[0].getUnit(), 'unit', 'unit should be...');
            assert.deepStrictEqual(variables[0].getLocation(), new PddlRange(0, 0, 0, '(said_hello)'.length), 'range');
        });

        it('finds one function with comment on top', () => {
            // GIVEN
            const predicatePddl = "; comment [unit]\n(said_hello) ";
            const predicatesNode = new PddlSyntaxTreeBuilder(predicatePddl).getTree().getRootNode();
            const positionResolver = new SimpleDocumentPositionResolver(predicatePddl);

            // WHEN
            const variables = new VariablesParser(predicatesNode, positionResolver).getVariables();

            assert.strictEqual(variables.length, 1, 'there should be 1 predicate');
            assert.strictEqual(variables[0].getFullName(), "said_hello", 'the predicate name should be...');
            assert.deepStrictEqual(variables[0].getDocumentation(), ['comment [unit]'], 'documentation should be...');
            assert.strictEqual(variables[0].getUnit(), 'unit', 'unit should be...');
            assert.deepStrictEqual(variables[0].getLocation(), new PddlRange(1, 0, 1, '(said_hello)'.length), 'range');
        });

        it('finds one predicate with two comments on top', () => {
            // GIVEN
            const predicatePddl = `; comment1
            ; comment2 [unit]
            (said_hello) `;
            const predicatesNode = new PddlSyntaxTreeBuilder(predicatePddl).getTree().getRootNode();
            const positionResolver = new SimpleDocumentPositionResolver(predicatePddl);

            // WHEN
            const variables = new VariablesParser(predicatesNode, positionResolver).getVariables();

            assert.strictEqual(variables.length, 1, 'there should be 1 predicate');
            assert.strictEqual(variables[0].getFullName(), "said_hello", 'the predicate name should be...');
            assert.deepStrictEqual(variables[0].getDocumentation(), ['comment1', 'comment2 [unit]'], 'documentation should be...');
            assert.strictEqual(variables[0].getUnit(), 'unit', 'unit should be...');
        });

        it('finds two predicates with comment on top', () => {
            // GIVEN
            const predicatePddl = "; comment1 [unit1]\n(said_hello)\n; comment2 [unit2]\n(said_goodbye)";
            const predicatesNode = new PddlSyntaxTreeBuilder(predicatePddl).getTree().getRootNode();
            const positionResolver = new SimpleDocumentPositionResolver(predicatePddl);

            // WHEN
            const variables = new VariablesParser(predicatesNode, positionResolver).getVariables();

            assert.strictEqual(variables.length, 2, 'there should be 2 predicates');
            assert.strictEqual(variables[0].getFullName(), "said_hello", 'the predicate name should be...');
            assert.deepStrictEqual(variables[0].getDocumentation(), ['comment1 [unit1]'], 'documentation should be...');
            assert.strictEqual(variables[0].getUnit(), 'unit1', 'unit should be...');

            assert.strictEqual(variables[1].getFullName(), "said_goodbye", 'the predicate name should be...');
            assert.deepStrictEqual(variables[1].getDocumentation(), ['comment2 [unit2]'], 'documentation should be...');
            assert.strictEqual(variables[1].getUnit(), 'unit2', 'unit should be...');
            assert.deepStrictEqual(variables[1].getLocation(), new PddlRange(3, 0, 3, '(said_goodbye)'.length), 'range');
        });

        it('finds two predicates with comment to the right', () => {
            // GIVEN
            const predicatePddl = `; two predicates
            
            (said_hello) ; comment1 [unit1]
            (said_goodbye) ; comment2 [unit2]`;

            const predicatesNode = new PddlSyntaxTreeBuilder(predicatePddl).getTree().getRootNode();
            const positionResolver = new SimpleDocumentPositionResolver(predicatePddl);

            // WHEN
            const variables = new VariablesParser(predicatesNode, positionResolver).getVariables();

            assert.strictEqual(variables.length, 2, 'there should be 2 predicates');
            assert.strictEqual(variables[0].getFullName(), "said_hello", 'the predicate name should be...');
            assert.deepStrictEqual(variables[0].getDocumentation(), ['comment1 [unit1]'], 'documentation should be...');
            assert.strictEqual(variables[0].getUnit(), 'unit1', 'unit should be...');

            assert.strictEqual(variables[1].getFullName(), "said_goodbye", 'the predicate name should be...');
            assert.deepStrictEqual(variables[1].getDocumentation(), ['comment2 [unit2]'], 'documentation should be...');
            assert.strictEqual(variables[1].getUnit(), 'unit2', 'unit should be...');
        });

        it('finds one predicate with one comments on top, ignores comments above empty line', () => {
            // GIVEN
            const predicatePddl = `; general comments
            
            ; comment1
            (said_hello) `;
            const predicatesNode = new PddlSyntaxTreeBuilder(predicatePddl).getTree().getRootNode();
            const positionResolver = new SimpleDocumentPositionResolver(predicatePddl);

            // WHEN
            const variables = new VariablesParser(predicatesNode, positionResolver).getVariables();

            assert.strictEqual(variables.length, 1, 'there should be 1 predicate');
            assert.strictEqual(variables[0].getFullName(), "said_hello", 'the predicate name should be...');
            assert.deepStrictEqual(variables[0].getDocumentation(), ['comment1'], 'documentation should be...');
        });

        it('finds one predicate with comment on top and right', () => {
            // GIVEN
            const predicatePddl = `; comment
            (said_hello) ; [unit] `;
            const predicatesNode = new PddlSyntaxTreeBuilder(predicatePddl).getTree().getRootNode();
            const positionResolver = new SimpleDocumentPositionResolver(predicatePddl);

            // WHEN
            const variables = new VariablesParser(predicatesNode, positionResolver).getVariables();

            assert.strictEqual(variables.length, 1, 'there should be 1 predicate');
            assert.strictEqual(variables[0].getFullName(), "said_hello", 'the predicate name should be...');
            assert.deepStrictEqual(variables[0].getDocumentation(), ['comment', '[unit]'], 'documentation should be...');
            assert.strictEqual(variables[0].getUnit(), 'unit', 'unit should be...');
        });

    });

    describe('#parseParameters', () => {
        it('finds one parameter', () => {
            // GIVEN
            const predicatePddl = `predicate1 ?p - type1`;

            // WHEN
            const parameters = parseParameters(predicatePddl);

            assert.equal(parameters.length, 1, 'there should be 1 parameter');
            assert.equal(parameters[0].name, 'p', 'the parameter name should be...');
            assert.equal(parameters[0].type, 'type1', 'the parameter type should be...');
        });

        it('finds two parameters in ?p1 - type1 ?p2 - type2', () => {
            // GIVEN
            const predicatePddl = `predicate1 ?p1 - type1 ?p2 - type2`;

            // WHEN
            const parameters = parseParameters(predicatePddl);

            assert.equal(parameters.length, 2, 'there should be 2 parameters');
            assert.equal(parameters[0].name, 'p1', 'the parameter name should be...');
            assert.equal(parameters[0].type, 'type1', 'the parameter name should be...');
            assert.equal(parameters[1].name, 'p2', 'the parameter name should be...');
            assert.equal(parameters[1].type, 'type2', 'the parameter name should be...');
        });

        it('finds two parameters in ?p1 ?p2 - type2', () => {
            // GIVEN
            const predicatePddl = `predicate1 ?p1 ?p2 - type2`;

            // WHEN
            const parameters = parseParameters(predicatePddl);

            // THEN
            assert.equal(parameters.length, 2, 'there should be 2 parameters');
            assert.equal(parameters[0].name, 'p1', 'the parameter name should be...');
            assert.equal(parameters[0].type, 'type2', 'the parameter name should be...');
            assert.equal(parameters[1].name, 'p2', 'the parameter name should be...');
            assert.equal(parameters[1].type, 'type2', 'the parameter name should be...');
        });
    });
});