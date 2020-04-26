/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as assert from 'assert';
import { PddlPlanParser } from './src';
import { PlanStep, Happening, HappeningType, PddlLanguage } from '../src';
import { URI } from 'vscode-uri';

describe('PddlPlanParser', () => {

    describe('#parseText', () => {

        it('parses non-temporal plan', () => {
            // GIVEN
            const planText = `;;!domain: domain1
            ;;!problem: problem1
            
            0.00100: (a)
            
            ; Makespan: 0.001
            ; Cost: 0.001
            ; States evaluated: 1`;

            const fileUri = URI.parse('file://directory/file1.plan');
            const epsilon = 0.1;
            // WHEN
            const planInfo = PddlPlanParser.parseText(planText, epsilon, fileUri, 33);

            // THEN
            assert.ok(planInfo !== undefined);
            assert.strictEqual(planInfo?.fileUri, fileUri);
            const expectedHappening = new Happening(0.001, HappeningType.INSTANTANEOUS, 'a', 0, 0);
            assert.deepStrictEqual(planInfo?.getHappenings(), [expectedHappening], 'there should be 1 happening');
            assert.strictEqual(planInfo?.getLanguage(), PddlLanguage.PLAN, 'the language should be plan');
            assert.deepStrictEqual(planInfo?.isPlan(), true, 'this should be a plan');
            assert.deepStrictEqual(planInfo?.getParsingProblems(), [], 'there should be no parsing issues');
            assert.deepStrictEqual(planInfo?.getVersion(), 33, 'version');
            const expectedStep = new PlanStep(0.001, 'a', false, epsilon, 3);
            assert.deepStrictEqual(planInfo?.getSteps(), [expectedStep], 'this should be a plan');
        });

        it('parses temporal plan', () => {
            // GIVEN
            const planText = `;;!domain: domain1
            ;;!problem: problem1
            
            0.00100: (a p1 p2) [10]
            
            ; Makespan: 0.001
            ; Cost: 0.001
            ; States evaluated: 1`;

            const fileUri = URI.parse('file://directory/file1.plan');
            const epsilon = 0.1;
            // WHEN
            const planInfo = PddlPlanParser.parseText(planText, epsilon, fileUri, 33);

            // THEN
            assert.ok(planInfo !== undefined);
            assert.strictEqual(planInfo?.fileUri, fileUri);
            const expectedHappenings = [
                new Happening(0.001, HappeningType.START, 'a p1 p2', 0, 0),
                new Happening(10.001, HappeningType.END, 'a p1 p2', 0, 0)
            ];
            assert.deepStrictEqual(planInfo?.getHappenings(), expectedHappenings, 'there should be 2 happenings');
            assert.strictEqual(planInfo?.getLanguage(), PddlLanguage.PLAN, 'the language should be plan');
            assert.deepStrictEqual(planInfo?.isPlan(), true, 'this should be a plan');
            assert.deepStrictEqual(planInfo?.getParsingProblems(), [], 'there should be no parsing issues');
            assert.deepStrictEqual(planInfo?.getVersion(), 33, 'version');
            const expectedStep = new PlanStep(0.001, 'a p1 p2', true, 10, 3);
            assert.deepStrictEqual(planInfo?.getSteps(), [expectedStep], 'this should be a plan');
        });
    });
});

