/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { URI } from "vscode-uri";
import { PddlSyntaxTree, } from "./parser/src";
import {
    TimedVariableValue, VariableValue,
    TypeObjectMap, ProblemInfo, DocumentPositionResolver, SimpleDocumentPositionResolver
} from "./src";

const expect = require('chai').expect;

function createPositionResolver(): DocumentPositionResolver {
    return new SimpleDocumentPositionResolver('');
}

describe("ProblemInfo", () => {
    describe("#clone", () => {
        it('clones', () => {
            const function1 = "function1"
            const function1obj1 = function1 + " obj1";
            const value1 = 3.14;

            const problem = new ProblemInfo(URI.parse("file:///fake"), 1, "problem1", "domain1", PddlSyntaxTree.EMPTY, createPositionResolver());
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
});