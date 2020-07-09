/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as assert from 'assert';
import { expect } from 'chai';
import { PddlPlannerOutputParser } from './src';
import { DomainInfo } from '../src';
import { ProblemInfo } from '../src';
import { PddlSyntaxTree } from './src';
import { SimpleDocumentPositionResolver } from '../src';
import { URI } from 'vscode-uri';

const uri = URI.parse('file:///mock');
const dummyDomain = new DomainInfo(uri, 1, '', new PddlSyntaxTree(), new SimpleDocumentPositionResolver(''));
const dummyProblem = new ProblemInfo(uri, 1, 'name', 'name', new PddlSyntaxTree(), new SimpleDocumentPositionResolver(''));
const EPSILON = 1e-3;

describe('PddlPlannerOutputParser', () => {

    describe('#appendBuffer()', () => {

        it('parses single-durative-action plan', () => {
            // GIVEN
            const planText = '1: (action) [20]';

            // WHEN
            const parser = new PddlPlannerOutputParser(dummyDomain, dummyProblem, { epsilon: EPSILON });
            parser.appendBuffer(planText);
            parser.onPlanFinished();
            const plans = parser.getPlans();

            // THEN
            assert.strictEqual(plans.length, 1, 'there should be one empty plan');
            const plan = plans[0];
            assert.strictEqual(plan.makespan, 21, 'plan makespan');
            assert.strictEqual(plan.steps.length, 1, 'plan should have one action');
            assert.strictEqual(plan.steps[0].getStartTime(), 1, 'start time');
            assert.strictEqual(plan.steps[0].getActionName(), 'action', 'action name');
            assert.strictEqual(plan.steps[0].getFullActionName(), 'action', 'full action name');
            assert.strictEqual(plan.steps[0].isDurative, true, 'action isDurative');
            assert.strictEqual(plan.steps[0].getDuration(), 20, 'action duration');
        });

        it('parses plan metrics', () => {
            // GIVEN
            const metricNumber = 123.321;
            const metricText = "123.321";
            const duration = 20;
            const startTime = 1;
            const actionName = "action1";
            const planText = `Plan found with cost: ${metricText}\n${startTime}: (${actionName}) [${duration}]`;

            // WHEN
            const parser = new PddlPlannerOutputParser(dummyDomain, dummyProblem, { epsilon: EPSILON });
            parser.appendBuffer(planText);
            parser.onPlanFinished();
            const plans = parser.getPlans();

            // THEN
            assert.strictEqual(plans.length, 1, 'there should be one empty plan');
            const plan = plans[0];
            assert.strictEqual(plan.makespan, duration + startTime, 'plan makespan');
            assert.strictEqual(plan.cost, metricNumber, 'plan cost');
            assert.strictEqual(plan.steps.length, 1, 'plan should have one action');
            assert.strictEqual(plan.steps[0].getStartTime(), startTime, 'start time');
            assert.strictEqual(plan.steps[0].getActionName(), actionName, 'action name');
            assert.strictEqual(plan.steps[0].getFullActionName(), actionName, 'full action name');
            assert.strictEqual(plan.steps[0].isDurative, true, 'action isDurative');
            assert.strictEqual(plan.steps[0].getDuration(), duration, 'action duration');
        });

        it('parses plan with negative metrics', () => {
            // GIVEN
            const metricNumber = -123.321;
            const metricText = "-123.321";
            const duration = 20;
            const startTime = 1;
            const actionName = "action1";
            const planText = `Plan found with cost: ${metricText}\n${startTime}: (${actionName}) [${duration}]`;

            // WHEN
            const parser = new PddlPlannerOutputParser(dummyDomain, dummyProblem, { epsilon: EPSILON });
            parser.appendBuffer(planText);
            parser.onPlanFinished();
            const plans = parser.getPlans();

            // THEN
            assert.strictEqual(plans.length, 1, 'there should be one plan');
            const plan = plans[0];
            assert.strictEqual(plan.cost, metricNumber, 'plan cost');
            assert.strictEqual(plan.steps.length, 1, 'plan should have one action');
        });

        it('parses improving plan cost', () => {
            // GIVEN
            const metricNumber = 95.000;
            const metricText = "95.000";
            const duration = 20;
            const startTime = 1;
            const actionName = "action1";
            const planText = `; Plan found with metric ${metricText}\n${startTime}: (${actionName}) [${duration}]`;

            // WHEN
            const parser = new PddlPlannerOutputParser(dummyDomain, dummyProblem, { epsilon: EPSILON });
            parser.appendBuffer(planText);
            parser.onPlanFinished();
            const plans = parser.getPlans();

            // THEN
            expect(plans, 'there should be one empty plan').to.have.lengthOf(1);
            const plan = plans[0];
            expect(plan.cost, 'plan cost').to.equal(metricNumber);
            expect(plan.steps, 'plan should have one action').to.have.lengthOf(1);
        });

        it('parses multiple improving plans - popf', () => {
            // GIVEN
            const planText = `; All the ground actions in this problem are compression-safe
            ; Initial heuristic = 15.000
            ; b (14.000 | 140.000)b (12.000 | 140.001)b (10.000 | 140.001)b (8.000 | 140.001)b (6.000 | 140.001)b (5.000 | 245.002)b (3.000 | 245.003)b (2.000 | 260.001)
            ; Plan found with metric 515.000
            ; States evaluated so far: 10
            0.00000: (action1 g1 base-h)  [140.00000]
            0.00000: (action2 auv2 drake base-w)  [130.00000]
            0.00000: (action2 auv1 base-m base-a)  [55.00000]
            0.00100: (action3 g1 base-h)  [140.00000]
            55.00100: (action2 auv1 base-a base-r)  [40.00000]
            95.00200: (action4 auv1 base-r)  [150.00000]
            95.00300: (action3 auv1 base-r)  [150.00000]
            130.00100: (action4 auv2 base-w)  [130.00000]
            130.00200: (action3 auv2 base-w)  [130.00000]
            
            ; Resorting to best-first search
            ; b (14.000 | 140.000)b (13.000 | 130.000)b (13.000 | 55.000)b (12.000 | 140.000)b (11.000 | 130.000)b (9.000 | 200.000)b (8.000 | 200.000)b (6.000 | 200.000)b (5.000 | 260.001)b (3.000 | 260.002)b (2.000 | 2150.001)
            ; Plan found with metric 490.000
            ; States evaluated so far: 413
            0.00000: (action2 auv2 drake base-w)  [130.00000]
            0.00000: (action2 auv1 base-m base-r)  [200.00000]
            0.00000: (action1 g1 base-h)  [140.00000]
            0.00000: (action5 g3 base-m base-r)  [2000.00000]
            0.00100: (action3 g1 base-h)  [140.00000]
            130.00100: (action4 auv2 base-w)  [130.00000]
            130.00200: (action3 auv2 base-w)  [130.00000]
            2000.00100: (action1 g3 base-r)  [150.00000]
            2000.00200: (action3 g3 base-r)  [150.00000]
            b (0.000 | 2150.002)
            ; Plan found with metric 380.000
            ; States evaluated so far: 842
            0.00000: (action2 auv2 drake base-w)  [130.00000]
            0.00000: (action2 auv1 base-m base-r)  [200.00000]
            0.00000: (action1 g1 base-h)  [140.00000]
            0.00000: (action5 g2 base-h base-w)  [750.00000]
            0.00000: (action5 g3 base-m base-r)  [2000.00000]
            0.00100: (action3 g1 base-h)  [140.00000]
            750.00100: (action1 g2 base-w)  [130.00000]
            750.00200: (action3 g2 base-w)  [130.00000]
            2000.00100: (action1 g3 base-r)  [150.00000]
            2000.00200: (action3 g3 base-r)  [150.00000]
            
            ; Plan found with metric 275.000
            ; States evaluated so far: 7804
            0.00000: (action2 auv2 drake base-w)  [130.00000]
            0.00000: (action2 auv1 base-m base-a)  [55.00000]
            0.00000: (action1 g1 base-h)  [140.00000]
            0.00000: (action5 g2 base-h base-w)  [750.00000]
            0.00000: (action5 g3 base-m base-r)  [2000.00000]
            0.00100: (action3 g1 base-h)  [140.00000]
            55.00100: (action2 auv1 base-a base-r)  [40.00000]
            750.00100: (action1 g2 base-w)  [130.00000]
            750.00200: (action3 g2 base-w)  [130.00000]
            2000.00100: (action1 g3 base-r)  [150.00000]
            2000.00200: (action3 g3 base-r)  [150.00000]
            
            ; Plan found with metric 235.000
            ; States evaluated so far: 14221
            0.00000: (action2 auv2 drake base-w)  [130.00000]
            0.00000: (action2 auv1 base-m base-a)  [55.00000]
            0.00000: (action1 g1 base-h)  [140.00000]
            0.00000: (action5 g2 base-h base-w)  [750.00000]
            0.00000: (action5 g3 base-m base-r)  [2000.00000]
            0.00100: (action3 g1 base-h)  [140.00000]
            750.00100: (action1 g2 base-w)  [130.00000]
            750.00200: (action3 g2 base-w)  [130.00000]
            2000.00100: (action1 g3 base-r)  [150.00000]
            2000.00200: (action3 g3 base-r)  [150.00000]
            
            ; Plan found with metric 180.000
            ; States evaluated so far: 20775
            0.00000: (action2 auv2 drake base-w)  [130.00000]
            0.00000: (action1 g1 base-h)  [140.00000]
            0.00000: (action5 g2 base-h base-w)  [750.00000]
            0.00000: (action5 g3 base-m base-r)  [2000.00000]
            0.00100: (action3 g1 base-h)  [140.00000]
            750.00100: (action1 g2 base-w)  [130.00000]
            750.00200: (action3 g2 base-w)  [130.00000]
            2000.00100: (action1 g3 base-r)  [150.00000]
            2000.00200: (action3 g3 base-r)  [150.00000]
            
            ; Plan found with metric 145.000
            ; States evaluated so far: 23964
            0.00000: (action2 auv1 base-m base-a)  [55.00000]
            0.00000: (action1 g1 base-h)  [140.00000]
            0.00000: (action5 g2 base-h base-w)  [750.00000]
            0.00000: (action5 g3 base-m base-r)  [2000.00000]
            0.00100: (action3 g1 base-h)  [140.00000]
            55.00100: (action2 auv1 base-a base-r)  [40.00000]
            750.00100: (action1 g2 base-w)  [130.00000]
            750.00200: (action3 g2 base-w)  [130.00000]
            2000.00100: (action1 g3 base-r)  [150.00000]
            2000.00200: (action3 g3 base-r)  [150.00000]
            
            ; Plan found with metric 105.000
            ; States evaluated so far: 30628
            0.00000: (action2 auv1 base-m base-a)  [55.00000]
            0.00000: (action1 g1 base-h)  [140.00000]
            0.00000: (action5 g2 base-h base-w)  [750.00000]
            0.00000: (action5 g3 base-m base-r)  [2000.00000]
            0.00100: (action3 g1 base-h)  [140.00000]
            750.00100: (action1 g2 base-w)  [130.00000]
            750.00200: (action3 g2 base-w)  [130.00000]
            2000.00100: (action1 g3 base-r)  [150.00000]
            2000.00200: (action3 g3 base-r)  [150.00000]
            
            ; Plan found with metric 50.000
            ; States evaluated so far: 40250
            0.00000: (action1 g1 base-h)  [140.00000]
            0.00000: (action5 g2 base-h base-w)  [750.00000]
            0.00000: (action5 g3 base-m base-r)  [2000.00000]
            0.00100: (action3 g1 base-h)  [140.00000]
            750.00100: (action1 g2 base-w)  [130.00000]
            750.00200: (action3 g2 base-w)  [130.00000]
            2000.00100: (action1 g3 base-r)  [150.00000]
            2000.00200: (action3 g3 base-r)  [150.00000]
            Error: terminate called after throwing an instance of 'std::bad_alloc'
              what():  std::bad_alloc
            
            `;

            // WHEN
            const parser = new PddlPlannerOutputParser(dummyDomain, dummyProblem, { epsilon: EPSILON });
            parser.appendBuffer(planText);
            parser.onPlanFinished();
            const plans = parser.getPlans();

            // THEN
            expect(plans, 'plans').to.have.lengthOf(9);
            {
                const plan0 = plans[0];
                expect(plan0.cost, 'plan0 cost').to.equal(515);
                expect(plan0.statesEvaluated, 'plan0 states evaluated').to.equal(10);
                expect(plan0.makespan, 'plan0 makespan').to.equal(260.002);
                expect(plan0.steps, 'plan0 should have one action').to.have.lengthOf(9);
            }
            {
                const plan1 = plans[1];
                expect(plan1.cost, 'plan1 cost').to.equal(490);
                expect(plan1.statesEvaluated, 'plan1 states evaluated').to.equal(413);
                expect(plan1.makespan, 'plan1 makespan').to.equal(2150.002);
                expect(plan1.steps, 'plan1 should have one action').to.have.lengthOf(9);
            }
            {
                const plan8 = plans[8];
                expect(plan8.cost, 'plan8 cost').to.equal(50);
                expect(plan8.statesEvaluated, 'plan8 states evaluated').to.equal(40250);
                expect(plan8.makespan, 'plan8 makespan').to.equal(2150.002);
                expect(plan8.steps, 'plan8 should have one action').to.have.lengthOf(8);
            }
        });

        it('parses multiple improving plans - metis', () => {
            // GIVEN
            const planText = `Starting to plan...
            Pre-processing domain and problem...
            
            Search started for 'circus-stage' and 'date_2020-04-22' using 'Enforced Hill Climbing' strategy...
            46 Initial heuristic: 46.0
            
            45 44 43 42 41 40 39 38 37 36 35 34 33 32 31 30 29 28 
            Search started for 'circus-stage' and 'date_2020-04-22' using 'Best First Search (Parallel)' strategy...
            46 45 Initial heuristic: 46.0
            
            44 43 43 42 42 43 41 41 41 40 40 39 39 38 38 37 37 36 35 35 35 34 35 33 33 34 32 34 30 28 29 29 27 27 26 28 26 25 27 24 26 24 25 25 25 24 26 21 22 20 19 20 19 18 17 17 16 15 15 14 15 13 12 11 10 9 8 7 7 6 5 6 4 3 2 1 0 
            Printing plan for this domain and problem:
            Domain: circus-stage
            Problem: date_2020-04-22
            Plan was found:
            Metric: 264.006
            States evaluated: 187
              2.0010: (mob_mast qp-02 stage7 base)  [6.0000]
              2.0020: (mob_staple f2 stage5 stage7)  [6.0000]
              8.0010: (mob_swt swt3 stage11 stage5)  [6.0000]
             14.0020: (clean stage5 swt3)  [48.0000]
             60.0110: (staple stage7 f2)  [80.0000]
             62.0030: (mob_swt swt3 stage5 stage7)  [6.0000]
             68.0040: (clean stage7 swt3)  [120.0000]
             68.0050: (rocking_chairs stage7)  [5.0000]
            101.0010: (mob_mast je32 stage8 base)  [6.0000]
            140.0120: (mob_staple f2 stage7 stage8)  [6.0000]
            151.0080: (staple stage8 f2)  [48.0000]
            188.0050: (mob_swt swt3 stage7 stage8)  [6.0000]
            194.0060: (clean stage8 swt3)  [70.0000]
            194.0070: (rocking_chairs stage8)  [5.0000]
            199.0090: (mob_staple f2 stage8 stage1)  [6.0000]
            199.0110: (mob_swt swt2 stage4 stage1)  [6.0000]
            205.0100: (staple stage1 f2)  [36.0000]
            205.0120: (clean stage1 swt2)  [48.0000]
            End of plan print-out.
            Makespan: 264.0060
            Memory used (MB): 297
            Time needed (sec): 1.37900
            
            5 4 3 2 4 2 3 2 3 2 1 0 1 0 1 0 1 1 0 1 1 3 4 4 3 4 3 4 5 4 7 6 7 6 16 14 14 15 13 12 12 11 10 10 9 9 8 7 10 6 5 4 5 8 4 7 6 6 6 5 4 6 6 6 5 5 4 6 7 6 5 8 7 8 7 10 8 7 9 8 8 7 9 8 8 8 9 8 10 8 9 8 10 7 6 6 5 4 5 7 6 6 5 8 6 7 6 6 7 7 9 11 10 8 9 8 7 6 8 7 6 5 5 4 6 5 7 6 6 6 6 5 8 10 7 6 7 11 9 8 7 6 6 8 7 10 9 9 9 9 11 10 9 11 10 9 11 9 8 7 6 5 8 7 9 12 10 9 10 9 10 8 8 10 9 9 8 7 9 11 9 8 7 6 5 7 9 10 13 11 10 9 11 10 11 9 8 7 6 5 7 10 9 11 14 10 11 10 13 12 11 11 11 11 12 12 13 13 13 13 14 13 12 11 10 9 8 7 6 5 4 3 2 4 2 3 2 3 2 1 0 1 0 1 0 0 1 2 1 3 3 3 4 3 4 3 4 5 4 4 5 6 5 6 8 5 8 7 6 6 6 6 6 5 4 6 7 6 5 5 4 7 6 5 7 6 5 8 7 8 7 8 7 10 8 7 11 8 9 8 8 10 8 8 9 8 9 8 10 7 6 6 5 6 4 7 6 6 5 8 6 7 6 6 7 7 9 11 9 11 8 10 11 9 8 7 6 8 7 9 8 7 6 6 5 4 6 5 6 6 6 5 8 10 7 6 7 9 9 8 7 6 6 11 10 9 9 9 11 9 9 10 9 9 8 7 6 5 7 7 9 10 11 9 9 8 9 8 10 9 9 9 9 8 7 6 5 8 7 10 14 13 11 10 9 11 10 13 11 10 9 11 10 11 9 8 7 6 5 8 7 12 11 11 11 14 12 12 13 14 16 13 12 12 11 11 10 10 11 9 8 10 7 8 6 5 6 4 5 4 6 6 7 6 7 6 5 6 6 7 6 6 7 10 7 9 9 10 8 7 10 8 9 7 10 8 7 10 8 10 7 9 8 7 10 8 8 7 10 9 9 8 8 9 7 6 6 5 4 3 2 1 0 
            Printing plan for this domain and problem:
            Domain: circus-stage
            Problem: date_2020-04-22
            Plan was found:
            Metric: 258.017
            States evaluated: 1193
              2.0010: (mob_mast qp-02 stage7 base)  [6.0000]
              2.0020: (mob_staple f2 stage5 stage7)  [6.0000]
              8.0010: (mob_swt swt3 stage11 stage5)  [6.0000]
             14.0020: (clean stage5 swt3)  [48.0000]
             60.0110: (staple stage7 f2)  [80.0000]
             62.0030: (mob_swt swt3 stage5 stage7)  [6.0000]
             68.0040: (clean stage7 swt3)  [120.0000]
             68.0050: (rocking_chairs stage7)  [5.0000]
            101.0010: (mob_mast je32 stage8 base)  [6.0000]
            140.0120: (mob_staple f2 stage7 stage1)  [6.0000]
            140.0140: (mob_swt swt2 stage4 stage1)  [6.0000]
            146.0130: (staple stage1 f2)  [36.0000]
            182.0140: (mob_staple f2 stage1 stage8)  [6.0000]
            182.0160: (mob_swt swt2 stage1 stage8)  [6.0000]
            188.0050: (mob_swt swt3 stage7 stage1)  [6.0000]
            188.0150: (staple stage8 f2)  [48.0000]
            188.0170: (clean stage8 swt2)  [70.0000]
            188.0180: (rocking_chairs stage8)  [5.0000]
            194.0060: (clean stage1 swt3)  [48.0000]
            End of plan print-out.
            Makespan: 258.0170
            Memory used (MB): 226
            Time needed (sec): 5.67200
            
            1 1 0 1 0 0 1 1 2 1 2 4 3 2 4 3 4 3 4 3 4 3 4 4 5 4 3 4 3 4 5 4 5 5 5 4 4 6 6 10 6 5 8 6 7 6 5 6 7 6 7 7 7 6 6 7 7 10 8 11 11 9 10 8 8 8 9 8 8 8 10 8 8 7 10 9 12 10 8 9 8 7 6 6 9 8 10 9 8 11 9 8 7 10 9 12 8 7 10 8 7 10 9 10 8 8 9 9 9 10 9 11 9 10 9 10 9 10 9 11 10 10 12 9 10 8 8 8 9 8 8 10 8 8 9 9 9 13 9 10 10 9 9 8 7 6 5 8 7 9 11 10 9 8 8 11 14 10 11 11 10 10 10 9 8 7 6 6 9 10 8 7 6 8 7 6 6 9 9 9 9 8 7 6 5 8 7 10 10 13 11 12 10 9 9 10 9 10 8 8 9 10 9 8 9 8 10 9 9 10 9 10 8 8 8 10 11 10 11 9 9 10 9 9 10 9 9 11 10 11 12 10 11 14 10 11 10 14 13 11 10 10 11 10 9 10 10 9 11 12 10 12 11 14 11 11 14 10 9 8 12 7 10 8 7 10 9 10 8 8 10 9 9 11 8 11 7 9 8 10 9 12 8 7 8 7 10 9 10 8 8 9 11 9 14 10 11 12 10 9 12 10 8 9 12 8 10 9 9 11 14 10 11 12 10 10 14 10 11 10 10 13 12 11 12 11 14 11 12 11 11 11 11 11 12 10 9 10 9 8 9 8 10 9 9 14 10 12 11 14 12 12 11 11 11 11 11 11 11 14 13 11 12 14 13 11 12 12 13 11 13 12 11 14 12 10 11 11 12 14 11 12 12 11 14 10 9 12 8 10 9 8 10 9 10 11 10 9 10 11 11 11 13 11 12 14 12 14 12 11 14 13 12 12 11 11 10 9 8 8 8 9 10 9 10 9 8 8 11 12 12 11 11 12 11 10 9 9 12 12 11 11 11 10 10 9 8 8 8 9 9 10 9 8 12 11 10 9 13 13 12 11 13 11 10 9 8 8 8 9 12 11 10 9 8 8 11 13 12 11 11 13 14 12 12 11 15 14 12 13 12 11 13 12 11 13 12 16 12 13 12 11 10 9 10 9 13 14 13 14 12 13 12 13 12 13 14 13 13 12 12 14 13 13 12 12 11 11 10 9 10 9 10 11 9 11 12 10 10 13 12 11 10 9 10 14 12 11 12 13 12 13 15 14 13 14 12 12 11 13 11 12 10 9 10 9 10 9 10 9 11 9 9 11 11 12 10 11 10 12 10 10 14 11 12 11 11 12 10 9 10 9 10 9 10 9 12 15 13 12 12 12 13 13 14 14 13 12 13 12 13 16 14 13 14 13 14 13 12 12 13 12 13 15 14 13 13 14 13 12 11 10 11 10 14 13 12 11 12 10 12 10 12 11 16 15 14 13 12 11 13 14 12 12 11 14 13 14 14 13 15 14 12 12 11 12 11 14 13 13 14 13 15 14 16 15 14 15 16 15 17 16 14 15 15 16 15 15 15 15 15 15 15 16 15 17 14 13 13 12 11 14 10 10 11 9 8 7 6 5 8 7 8 12 11 9 8 11 10 9 11 8 7 6 5 6 5 9 9 11 10 11 10 10 9 9 11 11 12 14 11 10 11 10 9 10 11 10 9 12 10 10 11 11 12 15 15 13 16 14 12 13 13 13 13 14 14 14 15 14 13 13 15 16 16 17 16 16 18 17 16 15 15 17 18 16 16 17 17 17 22 25 24 25 24 23 25 25 23 22 21 21 22 20 20 19 21 20 18 17 19 18 16 18 17 15 16 14 13 14 12 11 11 10 9 8 8 7 8 6 5 6 4 4 6 10 7 6 5 4 6 6 5 4 6 6 6 5 7 6 5 4 3 2 1 0 
            Printing plan for this domain and problem:
            Domain: circus-stage
            Problem: date_2020-04-22
            Plan was found:
            Metric: 227.008
            States evaluated: 2983
              2.0010: (mob_mast qp-02 stage7 base)  [6.0000]
              2.0020: (mob_staple f2 stage5 stage7)  [6.0000]
              8.0010: (mob_swt swt3 stage11 stage5)  [6.0000]
             14.0020: (clean stage5 swt3)  [48.0000]
             23.0010: (mob_staple f2 stage7 stage1)  [6.0000]
             23.0030: (mob_swt swt2 stage4 stage1)  [6.0000]
             29.0020: (staple stage1 f2)  [36.0000]
             29.0040: (clean stage1 swt2)  [48.0000]
             65.0030: (mob_staple f2 stage1 stage7)  [6.0000]
             65.0050: (mob_swt swt3 stage5 stage7)  [6.0000]
             71.0040: (staple stage7 f2)  [80.0000]
             71.0060: (clean stage7 swt3)  [120.0000]
             71.0070: (rocking_chairs stage7)  [5.0000]
            101.0010: (mob_mast je32 stage8 base)  [6.0000]
            151.0050: (mob_staple f2 stage7 stage8)  [6.0000]
            151.0070: (mob_swt swt2 stage1 stage8)  [6.0000]
            157.0060: (staple stage8 f2)  [48.0000]
            157.0080: (clean stage8 swt2)  [70.0000]
            157.0090: (rocking_chairs stage8)  [5.0000]
            End of plan print-out.
            Makespan: 227.0080
            Memory used (MB): 238
            Time needed (sec): 11.3700
            
            1 0 1 0 0 1 2 1 2 1 8 7 10 8 8 10 8 8 10 9 9 17 15 15 17 16 15 17 15 14 13 12 11 16 19 17 16 15 14 13 12 11 10 9 8 7 8 6 10 6 7 9 10 8 8 8 9 8 10 9 9 9 18 17 15 14 13 12 11 10 9 8 7 8 6 7 10 6 7 9 8 10 8 10 8 8 10 9 9 15 15 15 17 19 18 16 16 15 14 14 13 13 12 14 11 13 12 11 10 9 9 8 7 8 6 7 6 6 6 9 10 8 8 8 9 8 10 9 9 11 10 9 11 9 8 8 7 6 7 9 8 7 7 6 8 8 8 8 7 6 5 4 6 5 6 11 9 9 11 9 9 8 11 9 9 10 10 12 12 12 11 11 10 9 8 7 8 9 8 7 6 5 8 7 12 8 10 9 10 11 10 9 9 9 12 10 10 9 12 10 10 10 11 10 11 13 13 15 14 17 15 15 15 16 15 14 13 15 14 13 12 11 12 11 10 9 8 8 7 8 10 9 10 8 8 16 18 17 16 16 15 15 16 17 17 16 15 16 17 16 15 17 16 15 17 17 16 16 15 16 14 12 11 10 11 9 8 7 6 7 10 8 8 8 8 8 7 6 5 4 6 5 6 11 9 9 8 10 9 10 10 10 16 14 13 14 12 11 11 10 9 8 8 7 8 10 9 10 8 8 14 15 16 23 Process killing requested.
            24 22 22 23 22 25 24 23 24 22 21 22 20 20 21 22 21 20 21 21 23 25 24 24 24 23 22 24 22 21 21 20 20 20 19 18 19 18 20 18 18 Planner found 3 plan(s) in 115.279secs.
            
            `;

            // WHEN
            const parser = new PddlPlannerOutputParser(dummyDomain, dummyProblem, { epsilon: EPSILON });
            parser.appendBuffer(planText);
            parser.onPlanFinished();
            const plans = parser.getPlans();

            // THEN
            expect(plans, 'plans').to.have.lengthOf(3);
            {
                const plan0 = plans[0];
                expect(plan0.cost, 'plan0 cost').to.equal(264.006);
                expect(plan0.statesEvaluated, 'plan0 states evaluated').to.equal(187);
                expect(plan0.makespan, 'plan0 makespan').to.equal(264.006);
                expect(plan0.steps, 'plan0 should have one action').to.have.lengthOf(18);
            }
            {
                const plan1 = plans[1];
                expect(plan1.cost, 'plan1 cost').to.equal(258.017);
                expect(plan1.statesEvaluated, 'plan1 states evaluated').to.equal(1193);
                expect(plan1.makespan, 'plan1 makespan').to.equal(258.017);
                expect(plan1.steps, 'plan1 should have one action').to.have.lengthOf(19);
            }
            {
                const plan2 = plans[2];
                expect(plan2.cost, 'plan2 cost').to.equal(227.008);
                expect(plan2.statesEvaluated, 'plan2 states evaluated').to.equal(2983);
                expect(plan2.makespan, 'plan2 makespan').to.equal(227.008);
                expect(plan2.steps, 'plan2 should have one action').to.have.lengthOf(19);
            }
        });

        it('parses plan metrics in scientific notation', () => {
            // GIVEN
            const metricNumber = -1.23456e-30;
            const metricText = "-1.23456e-30";
            const duration = 20;
            const startTime = 1;
            const actionName = "action1";
            const planText = `Plan found with cost: ${metricText}\n${startTime}: (${actionName}) [${duration}]`;

            // WHEN
            const parser = new PddlPlannerOutputParser(dummyDomain, dummyProblem, { epsilon: EPSILON });
            parser.appendBuffer(planText);
            parser.onPlanFinished();
            const plans = parser.getPlans();

            // THEN
            expect(plans, 'there should be one plan').to.have.lengthOf(1);
            const plan = plans[0];
            expect(plan.makespan, 'plan makespan').to.equal(duration + startTime);
            expect(plan.cost, 'plan cost').to.be.closeTo(metricNumber, 1e-40);
            assert.strictEqual(plan.steps.length, 1, 'plan should have one action');
            assert.strictEqual(plan.steps[0].getStartTime(), startTime, 'start time');
            assert.strictEqual(plan.steps[0].getActionName(), actionName, 'action name');
            assert.strictEqual(plan.steps[0].getFullActionName(), actionName, 'full action name');
            assert.strictEqual(plan.steps[0].isDurative, true, 'action isDurative');
            assert.strictEqual(plan.steps[0].getDuration(), duration, 'action duration');
        });

        it('parses empty document', () => {
            // GIVEN
            const planText = '';

            // WHEN
            const parser = new PddlPlannerOutputParser(dummyDomain, dummyProblem, { epsilon: EPSILON, minimumPlansExpected: 1 });
            parser.appendBuffer(planText);
            parser.onPlanFinished();
            const plans = parser.getPlans();

            // THEN
            assert.strictEqual(plans.length, 1, 'there should be one empty plan');
        });

        it('parses empty plan with only meta-data', () => {
            // GIVEN
            const planText = `;;!domain: d1
            ;;!problem: p1
            
            ; Makespan: 0.000
            ; Cost: 0.000
            ; States evaluated: 10`;

            // WHEN
            const parser = new PddlPlannerOutputParser(dummyDomain, dummyProblem, { epsilon: EPSILON, minimumPlansExpected: 1 });
            parser.appendBuffer(planText);
            parser.onPlanFinished();
            const plans = parser.getPlans();

            // THEN
            assert.strictEqual(plans.length, 1, 'there should be one empty plan');
            const plan = plans[0];
            assert.strictEqual(plan.makespan, 0, 'plan makespan');
            assert.strictEqual(plan.cost, 0, 'plan metric');
            assert.strictEqual(plan.statesEvaluated, 10, 'states evaluated');
        });

        it('parses xml plan', async () => {
            // GIVEN
            const planText = `States evaluated: 51
            <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
            <Plan>
                <Actions>
                    <OrderedHappening>
                        <HappeningID>1</HappeningID>
                        <ComesBefore>
                            <HappeningID>2</HappeningID>
                        </ComesBefore>
                        <Happening>
                            <ActionStart>
                                <ActionID>1</ActionID>
                                <Name>action1</Name>
                                <Parameters>
                                    <Parameter>
                                        <Symbol>c</Symbol>
                                    </Parameter>
                                    <Parameter>
                                        <Symbol>a</Symbol>
                                    </Parameter>
                                </Parameters>        
                                <ExpectedStartTime>P0DT3H0M7.200S</ExpectedStartTime>
                            </ActionStart>
                        </Happening>
            </OrderedHappening>
        </Actions>
        </Plan>
            End of plan print-out.`;

            // WHEN
            let parser: PddlPlannerOutputParser | null = null;
            await new Promise((resolve) => {
                parser = new PddlPlannerOutputParser(dummyDomain, dummyProblem, { epsilon: EPSILON, minimumPlansExpected: 1 }, () => resolve());
                parser.appendBuffer(planText);
            });
            if (!parser) { assert.fail("launching plan parser failed"); }
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const plans = parser!.getPlans();

            // THEN
            assert.strictEqual(plans.length, 1, 'there should be one plan');
            const plan = plans[0];
            assert.strictEqual(plan.makespan, 10807.2, 'plan makespan');
            assert.strictEqual(plan.cost, 10807.2, 'plan metric');
            assert.strictEqual(plan.statesEvaluated, 51, 'states evaluated');
            assert.strictEqual(plan.steps.length, 1, 'plan should have one action');
            assert.strictEqual(plan.steps[0].getStartTime(), 10807.2, 'start time');
            assert.strictEqual(plan.steps[0].getActionName(), 'action1', 'action name');
            assert.strictEqual(plan.steps[0].getFullActionName(), 'action1 c a', 'full action name');
            assert.strictEqual(plan.steps[0].isDurative, false, 'action isDurative');
        });

        it('parses xml with temporal plan', async () => {
            // GIVEN
            const planText = `States evaluated: 51
            <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
            <Plan>
                <Actions>
                    <OrderedHappening>
                        <HappeningID>1</HappeningID>
                        <ComesBefore>
                            <HappeningID>2</HappeningID>
                        </ComesBefore>
                        <Happening>
                            <ActionStart>
                                <ActionID>1</ActionID>
                                <Name>action1</Name>
                                <Parameters>
                                    <Parameter>
                                        <Symbol>c</Symbol>
                                    </Parameter>
                                    <Parameter>
                                        <Symbol>a</Symbol>
                                    </Parameter>
                                </Parameters>        
                                <ExpectedStartTime>P0DT0H1M0.000S</ExpectedStartTime>
                                <ExpectedDuration>P0DT1H0M0.000S</ExpectedDuration>
                            </ActionStart>
                        </Happening>
                </OrderedHappening>
                <OrderedHappening>
                    <HappeningID>2</HappeningID>
                    <ComesBefore>
                        <HappeningID>3</HappeningID>
                        <HappeningID>9</HappeningID>
                    </ComesBefore>
                    <ComesAfter>
                        <HappeningID>1</HappeningID>
                    </ComesAfter>
                    <Happening>
                        <ActionEnd>
                            <ActionID>1</ActionID>
                            </ActionEnd>
                        </Happening>
                    </OrderedHappening>                    
                </Actions>
            </Plan>
            End of plan print-out.`;

            // WHEN
            let parser: PddlPlannerOutputParser | null = null;
            await new Promise((resolve) => {
                parser = new PddlPlannerOutputParser(dummyDomain, dummyProblem, { epsilon: EPSILON, minimumPlansExpected: 1 }, () => resolve());
                parser.appendBuffer(planText);
            });
            if (!parser) { assert.fail("launching plan parser failed"); }
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const plans = parser!.getPlans();

            // THEN
            assert.strictEqual(plans.length, 1, 'there should be one plan');
            const plan = plans[0];
            assert.strictEqual(plan.makespan, 60+60*60, 'plan makespan');
            assert.strictEqual(plan.cost, 60+60*60, 'plan metric');
            assert.strictEqual(plan.statesEvaluated, 51, 'states evaluated');
            assert.strictEqual(plan.steps.length, 1, 'plan should have one action');
            assert.strictEqual(plan.steps[0].getStartTime(), 60, 'start time');
            assert.strictEqual(plan.steps[0].getActionName(), 'action1', 'action name');
            assert.strictEqual(plan.steps[0].getFullActionName(), 'action1 c a', 'full action name');
            assert.strictEqual(plan.steps[0].isDurative, true, 'action isDurative');
            assert.strictEqual(plan.steps[0].getDuration(), 60*60, 'action duration');
        });
    });
});
