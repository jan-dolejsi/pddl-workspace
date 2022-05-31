/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as assert from 'assert';
import { expect } from 'chai';
import { PddlPlanParser, PddlPlanBuilder } from './src';
import { PlanStep, Happening, HappeningType, PddlLanguage } from '../src';
import { URI } from 'vscode-uri';

describe('PddlPlanParser', () => {

    describe('#parseText', () => {

        it('parses non-temporal plan', () => {
            // GIVEN
            const makespan = 0.001;
            const cost = 0.12345;
            const states = 1;

            const planText = `;;!domain: domain1
            ;;!problem: problem1
            
            0.00100: (a)
            
            ; Makespan: ${makespan}
            ; Cost: ${cost}
            ; States evaluated: ${states}`;

            const fileUri = URI.parse('file://directory/file1.plan');
            const epsilon = 0.1;
            // WHEN
            const version = 33;
            const planInfo = new PddlPlanParser().parseText(planText, epsilon, fileUri, version);

            // THEN
            expect(planInfo).to.not.be.undefined;
            expect(planInfo?.fileUri).to.equal(fileUri);
            const expectedHappening = new Happening(0.001, HappeningType.INSTANTANEOUS, 'a', 0, 0);
            expect(planInfo?.getHappenings()).to.deep.equal([expectedHappening], 'there should be 1 happening');
            expect(planInfo?.getLanguage()).to.equal(PddlLanguage.PLAN, 'the language should be plan');
            expect(planInfo?.isPlan()).to.equal(true, 'this should be a plan');
            expect(planInfo?.getParsingProblems()).to.deep.equal([], 'there should be no parsing issues');
            expect(planInfo?.getVersion()).to.equal(version, 'version');
            const expectedStep = new PlanStep(0.001, 'a', false, epsilon, 3);
            expect(planInfo?.getSteps()).to.deep.equal([expectedStep], 'this should be a plan');
            expect(planInfo?.metric).to.equal(cost, "cost");
            expect(planInfo?.statesEvaluated).to.equal(states, "states evaluated");
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
            const planInfo = new PddlPlanParser().parseText(planText, epsilon, fileUri, 33);

            // THEN
            expect(planInfo).to.not.be.undefined;
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

        it('parses temporal plan with zero metric', () => {
            // GIVEN
            const planText = `;;!domain: domain1
            ;;!problem: problem1
            
            0.00100: (a p1 p2) [10]
            
            ; Makespan: 10.001
            ; Cost: 0
            ; States evaluated: 1`;

            const fileUri = URI.parse('file://directory/file1.plan');
            const epsilon = 0.1;
            // WHEN
            const planInfo = new PddlPlanParser().parseText(planText, epsilon, fileUri, 33);

            // THEN
            expect(planInfo).to.not.be.undefined;
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

        it('parses LPG plan', () => {
            // GIVEN
            const planText = `Parsing domain file:  domain 'DEPOT' defined ... done.
            Parsing problem file:  problem 'DEPOTPROB1818' defined ... done.
            
            
            
            Modality: Fast Planner
            
            Number of actions             :      90
            Number of conditional actions :       0
            Number of facts               :      40
            
            
            Analyzing Planning Problem:
                    Temporal Planning Problem: NO
                    Numeric Planning Problem: NO
                    Problem with Timed Initial Litearals: NO
                    Problem with Derived Predicates: NO
            
            Evaluation function weights:
                 Action duration 0.00; Action cost 1.00
            
            
            Computing mutex... done
            
            Preprocessing total time: 0.02 seconds
            
            Searching ('.' = every 50 search steps):
             solution found: 
            
            Plan computed:
               Time: (ACTION) [action Duration; action Cost]
             0.0000: (DRIVE TRUCK0 DISTRIBUTOR1 DISTRIBUTOR0) [D:1.0000; C:1.0000]
            
            
            Solution found:
            Total time:      0.03
            Search time:     0.02
            Actions:         11
            Execution cost:  11.00
            Duration:        5.000
            Plan quality:    11.000
                 Plan file:       plan_problem-9288Xc4FTm2tFa3I.pddl_1.SOL`;

            const fileUri = URI.parse('file://directory/file1.plan');
            const epsilon = 0.1;
            // WHEN
            const planInfo = new PddlPlanParser().parseText(planText, epsilon, fileUri, 33);

            // THEN
            expect(planInfo).to.not.be.undefined;
            expect(planInfo?.fileUri).to.deep.equal(fileUri);
            const expectedHappenings = [
                new Happening(0, HappeningType.START, 'DRIVE TRUCK0 DISTRIBUTOR1 DISTRIBUTOR0', 0, 0),
                new Happening(1, HappeningType.END, 'DRIVE TRUCK0 DISTRIBUTOR1 DISTRIBUTOR0', 0, 0),
            ];
            expect(planInfo?.getHappenings()).to.deep.equal(expectedHappenings, 'there should be N happenings');
            assert.strictEqual(planInfo?.getLanguage(), PddlLanguage.PLAN, 'the language should be plan');
            assert.deepStrictEqual(planInfo?.isPlan(), true, 'this should be a plan');
            assert.deepStrictEqual(planInfo?.getParsingProblems(), [], 'there should be no parsing issues');
            assert.deepStrictEqual(planInfo?.getVersion(), 33, 'version');
            const expectedStep0 = new PlanStep(0.000, 'DRIVE TRUCK0 DISTRIBUTOR1 DISTRIBUTOR0', true, 1, 31);
            expect(planInfo?.getSteps()).to.deep.equal([expectedStep0], 'this should be the plan');
        });

        it('parses PDDL4J plan', () => {
            // GIVEN
            const planText = `
            parsing domain file "domain--4976-qKNHzW6M2X2f-.pddl" done successfully
            parsing problem file "problem--4976-3GlAwE9PTWiS-.pddl" done successfully
            java.lang.IllegalStateException: Instrumentation environment not initialised.
            
            encoding problem done successfully (88 ops, 32 facts)
            * starting enforced hill climbing
            java.lang.IllegalStateException: Instrumentation environment not initialised.
            java.lang.IllegalStateException: Instrumentation environment not initialised.
            * enforced hill climbing succeeded
            * starting greedy best first search anytime (optimized)
            java.lang.IllegalStateException: Instrumentation environment not initialised.
            java.lang.IllegalStateException: Instrumentation environment not initialised.
            java.lang.IllegalStateException: Instrumentation environment not initialised.
            * greedy best first search anytime failed
            
            found plan as follows:
            
            0: (             walk driver1 s2 p1-2) [1]
            1: (             walk driver1 p1-2 s1) [1]
            2: (             walk driver1 s1 p1-0) [1]
            3: (             walk driver1 p1-0 s0) [1]
            4: (    board-truck driver1 truck1 s0) [1]
            5: ( drive-truck truck1 s0 s1 driver1) [1]
            6: (disembark-truck driver1 truck1 s1) [1]
            
            plan total cost: 7.00
            
            
            time spent:       0.07 seconds parsing 
                              0.12 seconds encoding 
                              0.04 seconds searching
                              0.24 seconds total time
            
            memory used:     -0.00 MBytes for problem representation
                             -0.00 MBytes for searching
                             -0.00 MBytes total
            
            
            `;

            const fileUri = URI.parse('file://directory/file1.plan');
            const epsilon = 1;
            // WHEN
            const planInfo = new PddlPlanParser().parseText(planText, epsilon, fileUri, 33);

            // THEN
            expect(planInfo).to.not.be.undefined;
            expect(planInfo?.fileUri).to.deep.equal(fileUri);
            assert.strictEqual(planInfo?.getLanguage(), PddlLanguage.PLAN, 'the language should be plan');
            assert.deepStrictEqual(planInfo?.isPlan(), true, 'this should be a plan');
            assert.deepStrictEqual(planInfo?.getParsingProblems(), [], 'there should be no parsing issues');
            assert.deepStrictEqual(planInfo?.getVersion(), 33, 'version');
            expect(planInfo?.metric).to.equal(7, 'version');
            const expectedStep0 = new PlanStep(0.000, 'walk driver1 s2 p1-2', true, 1, 18);
            expect(planInfo?.getSteps()[0]).to.deep.equal(expectedStep0, 'this should be the plan');
        });


        it('parses PDDL4J plan step', () => {
            // GIVEN
            const planText = `0: (             walk driver1 s2 p1-2) [1]`;
            const epsilon = 1;

            // WHEN
            const pddlPlanBuilder = new PddlPlanBuilder(epsilon);
            const planStep = new PddlPlanParser().parse(planText, 33, pddlPlanBuilder);

            // THEN
            expect(planStep).to.not.be.undefined;
            // expect(planStep?.commitment).to.deep.equal(PlanStepCommitment.Committed);
            expect(planStep?.fullActionName).to.equal('walk driver1 s2 p1-2', 'full action name');
            expect(planStep?.getActionName()).to.equal('walk', 'short action name');
            expect(planStep?.getDuration()).to.equal(1, 'duration');
            expect(planStep?.getStartTime()).to.equal(0, 'start time');
            expect(planStep?.getObjects()).to.deep.equal(['driver1', 's2', 'p1-2'], 'objects');
            const expectedStep0 = new PlanStep(0.000, 'walk driver1 s2 p1-2', true, 1, 33);
            expect(planStep).to.deep.equal(expectedStep0, 'this should be the plan');
        });

        it('parses plan step from dual-bfws-ffparser', () => {
            // GIVEN
            const planText = `(LIFT HOIST1 CRATE0 PALLET1 DISTRIBUTOR0)`;
            const epsilon = 1;

            // WHEN
            const pddlPlanBuilder = new PddlPlanBuilder(epsilon);
            const planStep = new PddlPlanParser().parse(planText, 33, pddlPlanBuilder);

            // THEN
            expect(planStep).to.not.be.undefined;
            // expect(planStep?.commitment).to.deep.equal(PlanStepCommitment.Committed);
            expect(planStep?.fullActionName).to.equal('LIFT HOIST1 CRATE0 PALLET1 DISTRIBUTOR0', 'full action name');
            expect(planStep?.getActionName()).to.equal('LIFT', 'short action name');
            expect(planStep?.getDuration()).to.equal(1, 'duration');
            expect(planStep?.getStartTime()).to.equal(0, 'start time');
            expect(planStep?.getObjects()).to.deep.equal(['HOIST1', 'CRATE0', 'PALLET1', 'DISTRIBUTOR0'], 'objects');
            const expectedStep0 = new PlanStep(0.000, 'LIFT HOIST1 CRATE0 PALLET1 DISTRIBUTOR0', false, epsilon, 33);
            expect(planStep).to.deep.equal(expectedStep0, 'this should be the plan');
        });
    });
});
