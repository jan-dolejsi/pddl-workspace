/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as assert from 'assert';
import * as path from 'path';
import { expect } from 'chai';
import { URI } from 'vscode-uri';
import { PddlSyntaxTreeBuilder } from './src';
import { SimpleDocumentPositionResolver } from '../src';
import { ProblemInfo, VariableValue, TimedVariableValue, SupplyDemand } from '../src';
import { PddlProblemParser } from './src';

describe('PddlProblemParser', () => {

    const uri = URI.parse('file:///mock');

    describe('#tryParse', () => {
        it('extracts domain name', async () => {

            const pddlProblemText = `(define (problem p1) (:domain domain_name))`;
            const syntaxTree = new PddlSyntaxTreeBuilder(pddlProblemText).getTree();
            const positionResolver = new SimpleDocumentPositionResolver(pddlProblemText);

            const problemUri = URI.file(path.join('folder1', 'problem.pddl'));
            // WHEN
            const problemInfo = await new PddlProblemParser()
            .tryParse(
                problemUri,
                1, // content version
                pddlProblemText,
                syntaxTree,
                positionResolver);
            
            // THEN
            expect(problemInfo).to.not.be.undefined;
            expect(problemInfo).to.be.instanceOf(ProblemInfo);
            expect(problemInfo?.fileUri).to.equal(problemUri, "uri");
            expect(problemInfo?.name).to.equal('p1');
            expect(problemInfo?.domainName).to.equal('domain_name');
        });
    });

    describe('#getProblemStructure', () => {
        it('parses objects for types with dashes', () => {
            // GIVEN
            const problemPddl = `
            (define (problem p1) (:domain d1)
            
            (:objects
              ta-sk1 task2 task3 - basic-task
            )
            
            (:init )
            (:goal )
            )
            `;
            const syntaxTree = new PddlSyntaxTreeBuilder(problemPddl).getTree();
            const positionResolver = new SimpleDocumentPositionResolver(problemPddl);
            const problemInfo = new ProblemInfo(uri, 1, "p1", "d1", syntaxTree, positionResolver);

            // WHEN
            new PddlProblemParser().getProblemStructure(problemInfo);

            assert.equal(problemInfo.getObjects("basic-task").length, 3, 'there should be 3 objects');
        });

        it('parses structure even where there is a requirements section', () => {
            // GIVEN
            const problemPddl = `
            (define (problem p1) (:domain d1)
            (:requirements :strips :fluents :durative-actions :timed-initial-literals :typing :conditional-effects :negative-preconditions :duration-inequalities :equality)
            (:objects
              task1 - task
            )
            
            (:init )
            (:goal )
            )
            `;
            const syntaxTree = new PddlSyntaxTreeBuilder(problemPddl).getTree();
            const positionResolver = new SimpleDocumentPositionResolver(problemPddl);
            const problemInfo = new ProblemInfo(uri, 1, "p1", "d1", syntaxTree, positionResolver);

            // WHEN
            new PddlProblemParser().getProblemStructure(problemInfo);

            assert.equal(problemInfo.getObjects("task").length, 1, 'there should be 1 object despite the requirements section');
        });
        
        it('parses problem with init values', () => {
            // GIVEN
            const problemPddl = `
            (define (problem p1) (:domain d1)
            (:requirements :strips :fluents)
            
            (:init 
                (p1)
                (= (f1) 1)
            )
            (:goal )
            )
            `;
            const syntaxTree = new PddlSyntaxTreeBuilder(problemPddl).getTree();
            const positionResolver = new SimpleDocumentPositionResolver(problemPddl);
            const problemInfo = new ProblemInfo(uri, 1, "p1", "d1", syntaxTree, positionResolver);

            // WHEN
            new PddlProblemParser().getProblemStructure(problemInfo);

            assert.strictEqual(problemInfo.getInits().length, 2, 'there should be 2 initial values');
            assert.deepStrictEqual(problemInfo.getInits()[0], new TimedVariableValue(0, "p1", true));
            assert.deepStrictEqual(problemInfo.getInits()[1], new TimedVariableValue(0, "f1", 1));
        });
        
        it('parses problem with supply-demand', () => {
            // GIVEN
            const problemPddl = `
            (define (problem p1) (:domain d1)
            (:requirements :strips :supply-demand)
            
            (:init 
                (supply-demand sd4 (and (condition1)) (over all (and (condition2))) 24.105 (effect3))
            )
            (:goal )
            )
            `;
            const syntaxTree = new PddlSyntaxTreeBuilder(problemPddl).getTree();
            const positionResolver = new SimpleDocumentPositionResolver(problemPddl);
            const problemInfo = new ProblemInfo(uri, 1, "p1", "d1", syntaxTree, positionResolver);

            // WHEN
            new PddlProblemParser().getProblemStructure(problemInfo);

            assert.equal(problemInfo.getSupplyDemands().length, 1, 'there should be 1 supply demand');
        });

        it('parses problem with multiple metrics', () => {
            // GIVEN
            const problemPddl = `
            (define (problem p1) (:domain d1)
            (:requirements :strips)
            
            (:metric minimize (cost) )
            (:metric minimize (risk) )
            )
            `;
            const syntaxTree = new PddlSyntaxTreeBuilder(problemPddl).getTree();
            const positionResolver = new SimpleDocumentPositionResolver(problemPddl);
            const problemInfo = new ProblemInfo(uri, 1, "p1", "d1", syntaxTree, positionResolver);

            // WHEN
            new PddlProblemParser().getProblemStructure(problemInfo);

            assert.equal(problemInfo.getMetrics().length, 2, 'there should be 2 metrics');
        });
    });

    describe('#parseInit', () => {
        it('parses a fact', () => {
            // GIVEN
            const variableValuePddl = '(p o1 o2)';
            const syntaxTree = new PddlSyntaxTreeBuilder(variableValuePddl).getTree();

            // WHEN
            const variableValue = new PddlProblemParser().parseInit(syntaxTree.getRootNode().getChildren()[0]);

            assert.deepStrictEqual(variableValue, new TimedVariableValue(0, "p o1 o2", true));
        });

        it('parses "at" predicate fact', () => {
            // GIVEN
            const variableValuePddl = '(at car1 location2)';
            const syntaxTree = new PddlSyntaxTreeBuilder(variableValuePddl).getTree();

            // WHEN
            const variableValue = new PddlProblemParser().parseInit(syntaxTree.getRootNode().getChildren()[0]);

            assert.deepStrictEqual(variableValue, new TimedVariableValue(0, "at car1 location2", true));
        });

        it('parses (not "at" predicate) fact', () => {
            // GIVEN
            const variableValuePddl = '(not (at car1 location2))';
            const syntaxTree = new PddlSyntaxTreeBuilder(variableValuePddl).getTree();

            // WHEN
            const variableValue = new PddlProblemParser().parseInit(syntaxTree.getRootNode().getChildren()[0]);

            assert.deepStrictEqual(variableValue, new TimedVariableValue(0, "at car1 location2", false));
        });

        it('parses a numeric value', () => {
            // GIVEN
            const variableValuePddl = '(= (f o1 o2) 3.14)';
            const syntaxTree = new PddlSyntaxTreeBuilder(variableValuePddl).getTree();

            // WHEN
            const variableValue = new PddlProblemParser().parseInit(syntaxTree.getRootNode().getChildren()[0]);

            assert.deepStrictEqual(variableValue, new TimedVariableValue(0, "f o1 o2", 3.14));
        });

        it('parses a timed fact', () => {
            // GIVEN
            const variableValuePddl = '(at 123.456 (p o1 o2))';
            const syntaxTree = new PddlSyntaxTreeBuilder(variableValuePddl).getTree();

            // WHEN
            const variableValue = new PddlProblemParser().parseInit(syntaxTree.getRootNode().getChildren()[0]);

            assert.deepStrictEqual(variableValue, new TimedVariableValue(123.456, "p o1 o2", true));
        });

        it('parses timed (not "at" predicate) fact', () => {
            // GIVEN
            const variableValuePddl = '(at 1 (not (at car1 location2)))';
            const syntaxTree = new PddlSyntaxTreeBuilder(variableValuePddl).getTree();

            // WHEN
            const variableValue = new PddlProblemParser().parseInit(syntaxTree.getRootNode().getChildren()[0]);

            assert.deepStrictEqual(variableValue, new TimedVariableValue(1, "at car1 location2", false));
        });

        it('parses a timed numeric value', () => {
            // GIVEN
            const variableValuePddl = '(at 123.456 (= (f o1 o2) 3.14))';
            const syntaxTree = new PddlSyntaxTreeBuilder(variableValuePddl).getTree();

            // WHEN
            const variableValue = new PddlProblemParser().parseInit(syntaxTree.getRootNode().getChildren()[0]);

            assert.deepStrictEqual(variableValue, new TimedVariableValue(123.456, "f o1 o2", 3.14));
        });

        it('parses a (not-ready) fact', () => {
            // GIVEN
            const variableValuePddl = '(not-ready)';
            const syntaxTree = new PddlSyntaxTreeBuilder(variableValuePddl).getTree();

            // WHEN
            const variableValue = new PddlProblemParser().parseInit(syntaxTree.getRootNode().getChildren()[0]);

            assert.deepStrictEqual(variableValue, new TimedVariableValue(0, "not-ready", true));
        });
    });

    describe('#parseSupplyDemand', () => {
        it('parses a supply demand contract', () => {
            // GIVEN
            const variableValuePddl = '(supply-demand sd4 (and (condition1)) (over all (and (condition2))) 24.105 (effect3))';
            const syntaxTree = new PddlSyntaxTreeBuilder(variableValuePddl).getTree();

            // WHEN
            const supplyDemand = new PddlProblemParser().parseSupplyDemand(syntaxTree.getRootNode().getChildren()[0]);

            assert.deepStrictEqual(supplyDemand, new SupplyDemand("sd4"));
        });
    });

    describe('#parseVariableValue', () => {
        it('parses a fact', () => {
            // GIVEN
            const variableValuePddl = '(p o1 o2)';
            const syntaxTree = new PddlSyntaxTreeBuilder(variableValuePddl).getTree();

            // WHEN
            const variableValue = new PddlProblemParser().parseVariableValue(syntaxTree.getRootNode().getChildren()[0]);

            assert.deepStrictEqual(variableValue, new VariableValue("p o1 o2", true));
        });

        it('parses a negated fact', () => {
            // GIVEN
            const variableValuePddl = '(not (p o1 o2))';
            const syntaxTree = new PddlSyntaxTreeBuilder(variableValuePddl).getTree();

            // WHEN
            const variableValue = new PddlProblemParser().parseVariableValue(syntaxTree.getRootNode().getChildren()[0]);

            assert.deepStrictEqual(variableValue, new VariableValue("p o1 o2", false));
        });

        it('parses invalid negated fact', () => {
            // GIVEN
            const variableValuePddl = '(not )'; // intentionally invalid
            const syntaxTree = new PddlSyntaxTreeBuilder(variableValuePddl).getTree();

            // WHEN
            const variableValue = new PddlProblemParser().parseVariableValue(syntaxTree.getRootNode().getChildren()[0]);

            assert.strictEqual(variableValue, undefined);
        });

        it('parses a numeric value', () => {
            // GIVEN
            const variableValuePddl = '(= (f o1 o2) 3.14)';
            const syntaxTree = new PddlSyntaxTreeBuilder(variableValuePddl).getTree();

            // WHEN
            const variableValue = new PddlProblemParser().parseVariableValue(syntaxTree.getRootNode().getChildren()[0]);

            assert.deepStrictEqual(variableValue, new VariableValue("f o1 o2", 3.14));
        });

        it('parses invalid numeric value', () => {
            // GIVEN
            const variableValuePddl = '(= (f o1 o2) )'; // intentionally invalid
            const syntaxTree = new PddlSyntaxTreeBuilder(variableValuePddl).getTree();

            // WHEN
            const variableValue = new PddlProblemParser().parseVariableValue(syntaxTree.getRootNode().getChildren()[0]);

            assert.strictEqual(variableValue, undefined);
        });
    });
});