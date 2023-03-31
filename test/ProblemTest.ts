/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { fail } from "assert";
import { URI } from "vscode-uri";
import {
    TimedVariableValue, VariableValue,
    TypeObjectMap, ProblemInfo, DocumentPositionResolver, SimpleDocumentPositionResolver,
    parser
} from "./src";

import { describe, it, expect } from 'vitest';

function createPositionResolver(): DocumentPositionResolver {
    return new SimpleDocumentPositionResolver('');
}

describe("ProblemInfo", () => {
    describe("#clone", () => {
        it('clones', () => {
            const function1 = "function1"
            const function1obj1 = function1 + " obj1";
            const value1 = 3.14;

            const problem = new ProblemInfo(URI.parse("file:///fake"), 1, "problem1", "domain1", parser.PddlSyntaxTree.EMPTY, createPositionResolver());
            problem.setObjects(new TypeObjectMap().add("type1", "obj1"));
            const function1obj1value1 = new VariableValue(function1obj1, value1);
            problem.setInits([
                TimedVariableValue.from(0, function1obj1value1)
            ]);

            const wiredProblem = JSON.parse(JSON.stringify(problem));

            // WHEN

            const actual = ProblemInfo.clone(wiredProblem);

            // THEN
            expect(actual).to.not.be.undefined;
            // expect(actual.getObjectsTypeMap()).to.be.deep.equal(plan.problem?.getObjectsTypeMap());
            expect(actual.getObjects("type1"), "objects of 'type1'").to.deep.equal(["obj1"]);

            const allTypeObjects = actual && actual.getObjectsTypeMap();
            expect(allTypeObjects).to.not.be.undefined;
            expect(allTypeObjects?.getTypeOf("obj1")?.type).to.equal('type1');

            expect(actual.getInits(), "inits").to.have.length(1);
            const actualFunction1Value = actual.getInits()[0];
            expect(actualFunction1Value.getTime(), "time").to.equal(0);
            expect(actualFunction1Value.getLiftedVariableName(), "lifted function name").to.equal(function1);
            expect(actualFunction1Value.getVariableName(), "grounded function name").to.equal(function1obj1);
            expect(actualFunction1Value.getValue(), "function1obj1 value").to.equal(value1);
            expect(actualFunction1Value.getVariableValue(), "function1obj1 value object").to.deep.equal(function1obj1value1);
        });
    });
    describe("#cloneWithInitStateAt", () => {
        it('merges new state with future TIL', async () => {
            const tilTime = 10;

            const problemPddl = `(define (problem problem_name) (:domain domain_name)
            (:objects 
                t1 - t
            )
            
            (:init
                ; comments
                (p t1)
                (at ${tilTime} (not (p t1)))
                (= (f t1) 1)
                (at 2 (= (f t1) 42))
            )
            
            (:goal (and
                (p t1)
            ))
            
            (:metric minimize (total-time))
            )
            `;
            const t1 = "t1";
            const p = "p";
            const f = "f";
            const ft1 = f + " " + t1;
            const pt1 = p + " " + t1;
            const pi = 3.14;

            const problem = await parser.PddlProblemParser.parseText(problemPddl);
            if (!problem) {
                fail("problem failed to parse");
            }

            const ft1NewValue = new VariableValue(ft1, pi);
            const newStateTime = 5;
            const newState = [
                TimedVariableValue.from(newStateTime, ft1NewValue)
            ];

            // WHEN

            const newProblemText = ProblemInfo.cloneWithInitStateAt(problem, newState, newStateTime);
            const actual = await parser.PddlProblemParser.parseText(newProblemText);

            // THEN
            expect(actual).to.not.be.undefined;
            expect(actual?.getObjects("t"), "objects of 't'").to.deep.equal(["t1"]);

            const allTypeObjects = actual && actual.getObjectsTypeMap();
            expect(allTypeObjects).to.not.be.undefined;
            expect(allTypeObjects?.getTypeOf("t1")?.type).to.equal('t');

            expect(actual?.getInits(), "inits").to.have.length(newState.length + 1);
            const actualFunctionValue = actual?.getInits().find(i => i.getLiftedVariableName() === f);
            expect(actualFunctionValue).to.not.be.undefined;
            expect(actualFunctionValue?.getTime(), "f t1 time").to.equal(0);
            expect(actualFunctionValue?.getLiftedVariableName(), "lifted function name").to.equal(f);
            expect(actualFunctionValue?.getVariableName(), "grounded function name").to.equal(ft1);
            expect(actualFunctionValue?.getValue(), "f t1 value").to.equal(pi);
            expect(actualFunctionValue?.getVariableValue(), "f t1 value object").to.deep.equal(ft1NewValue);

            const actualPredicateValue = actual?.getInits().find(i => i.getLiftedVariableName() === p);
            expect(actualPredicateValue).to.not.be.undefined;
            expect(actualPredicateValue?.getTime(), "p t1 time").to.equal(tilTime - newStateTime);
            expect(actualPredicateValue?.getLiftedVariableName(), "lifted predicate name").to.equal(p);
            expect(actualPredicateValue?.getVariableName(), "grounded predicate name").to.equal(pt1);
            expect(actualPredicateValue?.getValue(), "p t1 value").to.equal(false);
        });
    });
});