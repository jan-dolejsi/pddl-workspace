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

const dummyDomain = new DomainInfo('uri', 1, '', new PddlSyntaxTree(), new SimpleDocumentPositionResolver(''));
const dummyProblem = new ProblemInfo('uri', 1, 'name', 'name', new PddlSyntaxTree(), new SimpleDocumentPositionResolver(''));
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

        it('parses multiple improving plans', () => {
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
            expect(plans, 'there should be one empty plan').to.have.lengthOf(9);
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
