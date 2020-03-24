/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { PlanTimeSeriesParser, FunctionValues, StateValues, FunctionsValues } from './src';
import * as assert from 'assert';
import { Variable, ObjectInstance, Parameter } from '../src';

describe('PlanTimeSeriesParser', () => {

    describe('#getFunctionValues', () => {
        it('parses one function', () => {
            // GIVEN
            const functionName = "function1 param1 param2";
            const typeName = "type1";
            const csvData = functionName + `
            0, 10
            1, 11`;
            const function1 = new Variable(functionName, [new ObjectInstance("param1", typeName), new ObjectInstance("param2", typeName)]);

            // WHEN
            const parser = new PlanTimeSeriesParser([function1], csvData);

            // THEN
            assert.ok(parser.getFunctionValues(function1), "there should be values for this function");
            const functionValues = parser.getFunctionValues(function1);
            assert.equal(functionValues?.getLegend(), "param1 param2");
            assert.equal(functionValues?.variable, function1);
            assert.equal(functionValues?.values.length, 2, "there should be 2 x/y points");
            const values = functionValues?.values;
            assert.deepEqual(values, [[0, 10], [1, 11]]);
        });

        it('parses two functions', () => {
            // GIVEN
            const functionName1 = "function1";
            const function1 = new Variable(functionName1, []);

            const functionName2 = "function2";
            const function2 = new Variable(functionName2, []);
            
            const csvData = `${functionName1}
            0, 10
            1, 11
            ${functionName2}
            0, 5
            1.5, 7`;

            // WHEN
            const parser = new PlanTimeSeriesParser([function1, function2], csvData);

            // THEN
            assert.ok(parser.getFunctionValues(function1), "there should be values for this function1");
            const functionValues1 = parser.getFunctionValues(function1);
            assert.equal(functionValues1?.getLegend(), "");
            assert.equal(functionValues1?.variable, function1);
            const values1 = functionValues1?.values;
            assert.deepEqual(values1, [[0, 10], [1, 11]]);

            assert.ok(parser.getFunctionValues(function2), "there should be values for this function2");
            const functionValues2 = parser.getFunctionValues(function2);
            assert.equal(functionValues2?.getLegend(), "");
            assert.equal(functionValues2?.variable, function2);
            const values2 = functionValues2?.values;
            assert.deepEqual(values2, [[0, 5], [1.5, 7]]);
        });
    });

    
    describe('#getGroundedFunctionsValues', () => {
        it('finds two grounded function values', () => {
            // GIVEN
            const typeName = "type1";
            const functionName = "function1";
            const liftedFunction = new Variable(functionName, [new Parameter("p1", typeName)]);

            const function1 = liftedFunction.bind([new ObjectInstance('o1', typeName)]);

            const function2 = liftedFunction.bind([new ObjectInstance('o2', typeName)]);
            
            const csvData = `${function1.getFullName()}
            0, 10
            1, 11
            ${function2.getFullName()}
            0, 5
            1.5, 7`;

            // WHEN
            const parser = new PlanTimeSeriesParser([function1, function2], csvData);

            // THEN
            assert.equal(parser.getGroundedFunctionsValues(liftedFunction).length, 2, "there should be two results for this liftedFunction");
        });
    });
   
    describe('#getFunctionData', () => {
        it('finds single function data', () => {
            // GIVEN
            const functionName = "function1";
            const csvData = functionName + `
            0, 10
            1, 11`;
            const function1 = new Variable(functionName);

            // WHEN
            const parser = new PlanTimeSeriesParser([function1], csvData);

            // THEN
            assert.ok(parser.getFunctionData(function1), "there should be values for this function");
            const functionValues = parser.getFunctionData(function1);
            assert.equal(functionValues.values.length, 2, "there should be 2 x-y points");
            assert.deepEqual(functionValues.values, [[0, 10], [1, 11]]);
            assert.equal(functionValues.liftedVariable, function1, "lifted function");
            assert.deepEqual(functionValues.functions.length, 1, "#functions");
            assert.deepEqual(functionValues.functions[0], function1, "function[1]");
            assert.deepEqual(functionValues.legend, [functionName], "legend");
        });
        
        it('finds two grounded function values', () => {
            // GIVEN
            const typeName = "type1";
            const functionName = "function1";
            const liftedFunction = new Variable(functionName, [new Parameter("p1", typeName)]);

            const function1 = liftedFunction.bind([new ObjectInstance('o1', typeName)]);

            const function2 = liftedFunction.bind([new ObjectInstance('o2', typeName)]);
            
            const csvData = `${function1.getFullName()}
            0, 10
            1, 11
            ${function2.getFullName()}
            0, 5
            1.5, 7`;

            // WHEN
            const parser = new PlanTimeSeriesParser([function1, function2], csvData);

            // THEN
            const data = parser.getFunctionData(liftedFunction);
            assert.equal(data.values.length, 3, "there should be three merged results for this liftedFunction");
            assert.deepEqual(data.values[0], [0, 10, 5], 'first timestamp ...');
        });
    });

    describe('#join', () => {
        it('joins first function', () => {
            // GIVEN
            const functionName = "function1";
            const function1 = new Variable(functionName, []);
            const functionValues = new FunctionValues(function1);
            const time = 0.1;
            const value = 1;
            functionValues.addValue(time, value);

            // WHEN
            const states = PlanTimeSeriesParser.join([], functionValues);

            // THEN
            assert.equal(states.length, 1, "there should be one state");
            assert.equal(states[0].time, time);
            assert.equal(states[0].getValue(function1), value, "expected value");
        });

        it('joins second function', () => {
            // GIVEN
            const functionName = "function1";
            const function1 = new Variable(functionName, []);
            const previousStateValues = new StateValues(0);
            previousStateValues.setValue(function1, 0);

            const functionValues = new FunctionValues(function1);
            const time = 0.1;
            const value = 1;
            functionValues.addValue(time, value);

            // WHEN
            const states = PlanTimeSeriesParser.join([previousStateValues], functionValues);

            // THEN
            assert.equal(states.length, 2, "there should be two states");
            assert.equal(states[0].time, 0, "time of first data point");
            assert.equal(states[0].getValue(function1), 0, "expected value");
            assert.equal(states[1].time, time, "time of second data point");
            assert.equal(states[1].getValue(function1), value, "expected value");
        });
    });
});

describe('FunctionsValues', () => {

    describe('#isConstant', () => {
        it('single function single value is constant', () => {
            // GIVEN
            const functionName = "function1";
            const function1 = new Variable(functionName, []);
            const values = [[0, 1]];

            // WHEN
            const functionsValues = new FunctionsValues(function1, values, [function1]);
            
            // // THEN
            assert.ok(functionsValues.isConstant(), "single value should be constant");
        });

        it('single function two identical values are constant', () => {
            // GIVEN
            const functionName = "function1";
            const function1 = new Variable(functionName, []);
            const values = [[0, 1], [1, 1]];

            // WHEN
            const functionsValues = new FunctionsValues(function1, values, [function1]);
            
            // // THEN
            assert.ok(functionsValues.isConstant(), "single value should be constant");
        });

        it('two functions two identical values are constant', () => {
            // GIVEN
            const functionName = "function1";
            const function1 = new Variable(functionName, []);
            const values = [[0, 1, 2], [1, 1, 2]];

            // WHEN
            const functionsValues = new FunctionsValues(function1, values, [function1]);
            
            // // THEN
            assert.ok(functionsValues.isConstant(), "two values should be constant");
        });

        it('single function two different values are NOT constant', () => {
            // GIVEN
            const functionName = "function1";
            const function1 = new Variable(functionName, []);
            const values = [[0, 1], [1, 100]];

            // WHEN
            const functionsValues = new FunctionsValues(function1, values, [function1]);
            
            // // THEN
            assert.equal(functionsValues.isConstant(), false, "different value series should not be constant");
        });

        it('two functions, where one has two different values are NOT constant', () => {
            // GIVEN
            const functionName = "function1";
            const function1 = new Variable(functionName, []);
            const values = [[0, 1, 5], [1, 100, 5]];

            // WHEN
            const functionsValues = new FunctionsValues(function1, values, [function1]);
            
            // // THEN
            assert.equal(functionsValues.isConstant(), false, "different value series for one function should not be constant");
        });

    });
});