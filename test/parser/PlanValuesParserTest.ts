/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as assert from 'assert';
import { expect } from 'chai';

import { PlanValuesParser } from './src';
import { PlanStep } from '../src';
import { Variable, Parameter, ObjectInstance } from '../src';

describe('PlanValuesParser', () => {

    describe('#getValues', () => {
        it('parses one action, one function', () => {
            // GIVEN
            const actionName = "action param1 param2";
            const actionRow = actionName + ", 1, 2";
            const functionName = "function1";
            const function1 = new Variable(functionName, []);
            const planSteps = [
                new PlanStep(1, actionName, true, 2, undefined)
            ];

            // WHEN
            const parser = new PlanValuesParser(planSteps, [function1], [actionRow]);
            
            // THEN
            expect(parser.stateValues).to.have.length(2, "one durative action plan should generate 2 states (before/after");
            assert.equal(parser.stateValues[0].time, 1);
            assert.equal(parser.stateValues[0].getValue(functionName), 1, "expected value before");
            assert.equal(parser.stateValues[1].time, 3);
            assert.equal(parser.stateValues[1].getValue(functionName), 2, "expected value after");
            assert.deepEqual(parser.getValues(functionName), [[1, 1], [3, 2]], "Values vector for function");
        });

        it('parses one action, two functions', () => {
            // GIVEN
            const actionName = "action param1 param2";
            const actionRow = actionName + ", 1, 11, 2, 12";
            const functionNames = ["function1", "function2"];
            const functions = functionNames.map(name => new Variable(name, []));
            const planSteps = [
                new PlanStep(1, actionName, true, 2, undefined)
            ];

            // WHEN
            const parser = new PlanValuesParser(planSteps, functions, [actionRow]);
            
            // THEN
            expect(parser.stateValues).to.have.length(2, "one durative action plan should generate 2 states (before/after");
            assert.equal(parser.stateValues[0].time, 1);
            assert.equal(parser.stateValues[0].getValue(functionNames[0]), 1, "expected function1 value before");
            assert.equal(parser.stateValues[0].getValue(functionNames[1]), 11, "expected function2 value before");
            assert.equal(parser.stateValues[1].time, 3);
            assert.equal(parser.stateValues[1].getValue(functionNames[0]), 2, "expected function1 value after");
            assert.equal(parser.stateValues[1].getValue(functionNames[1]), 12, "expected function2 value after");

            assert.deepEqual(parser.getValues(functionNames[0]), [[1, 1], [3, 2]], "Values vector for function1");
            assert.deepEqual(parser.getValues(functionNames[1]), [[1, 11], [3, 12]], "Values vector for function2");
        });

        it('parses one action, two grounded functions', () => {
            // GIVEN
            const actionName = "action param1 param2";
            const actionRow = actionName + ", 1, 11, 2, 12";
            const type1 = "type1";
            const functionName = "function1";
            const liftedFunction = new Variable(functionName + " ?p - " + type1, [new Parameter("p", type1)]);
            const objects = ["o1", "o2"];
            const functions = objects.map(objectName => new Variable(liftedFunction.declaredName, [new ObjectInstance(objectName, type1)]));
            const planSteps = [
                new PlanStep(1, actionName, true, 2, undefined)
            ];

            // WHEN
            const parser = new PlanValuesParser(planSteps, functions, [actionRow]);
            
            // THEN
            expect(parser.stateValues).to.have.length(2, "one durative action plan should generate 2 states (before and after)");

            assert.deepEqual(parser.getValues(functionName), [[1, 1, 11], [3, 2, 12]], "Values vector for function1");
        });

        it('parses one instantaneous action, one function', () => {
            // GIVEN
            const actionName = "action1"; // this is an instantaneous action assigning value 13 to function1
            const actionRow = actionName + ", 13";
            const functionName = "function1";
            const function1 = new Variable(functionName, []);
            const planSteps = [
                new PlanStep(1, actionName, false, 0.001, undefined)
            ];

            // WHEN
            const parser = new PlanValuesParser(planSteps, [function1], [actionRow]);
            
            // THEN
            expect(parser.stateValues).to.have.length(1, "one instantaneous action plan should generate 1 state (after the action)");
            assert.equal(parser.stateValues[0].time, 1);
            assert.equal(parser.stateValues[0].getValue(functionName), 13, "expected value after the action");
            assert.deepEqual(parser.getValues(functionName), [[1, 13]], "Values vector for function");
        });
    });
});
