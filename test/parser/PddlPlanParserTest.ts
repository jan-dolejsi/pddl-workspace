/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as assert from 'assert';
import { PddlPlanParser } from './src';
import { DomainInfo } from '../src';
import { ProblemInfo } from '../src';
import { PddlSyntaxTree } from './src';
import { SimpleDocumentPositionResolver } from '../src';

const dummyDomain = new DomainInfo('uri', 1, '', new PddlSyntaxTree(), new SimpleDocumentPositionResolver(''));
const dummyProblem = new ProblemInfo('uri', 1, 'name', 'name', new PddlSyntaxTree(), new SimpleDocumentPositionResolver(''));
const EPSILON = 1e-3;

describe('PddlPlanParser', () => {

    describe('#appendBuffer()', () => {

        it('parses single-durative-action plan', () => {
            // GIVEN
            const planText = '1: (action) [20]';

            // WHEN
            const parser = new PddlPlanParser(dummyDomain, dummyProblem, { epsilon: EPSILON });
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
            const actionName = "aciton1";
            const planText = `Plan found with cost: ${metricText}\n${startTime}: (${actionName}) [${duration}]`;

            // WHEN
            const parser = new PddlPlanParser(dummyDomain, dummyProblem, { epsilon: EPSILON });
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
            const actionName = "aciton1";
            const planText = `Plan found with cost: ${metricText}\n${startTime}: (${actionName}) [${duration}]`;

            // WHEN
            const parser = new PddlPlanParser(dummyDomain, dummyProblem, { epsilon: EPSILON });
            parser.appendBuffer(planText);
            parser.onPlanFinished();
            const plans = parser.getPlans();

            // THEN
            assert.strictEqual(plans.length, 1, 'there should be one empty plan');
            const plan = plans[0];
            assert.strictEqual(plan.cost, metricNumber, 'plan cost');
            assert.strictEqual(plan.steps.length, 1, 'plan should have one action');
        });

        it('parses plan metrics in scientific notation', () => {
            // GIVEN
            const metricNumber = -1.23451e-50;
            const metricText = "-1.23451e-50";
            const duration = 20;
            const startTime = 1;
            const actionName = "aciton1";
            const planText = `Plan found with cost: ${metricText}\n${startTime}: (${actionName}) [${duration}]`;

            // WHEN
            const parser = new PddlPlanParser(dummyDomain, dummyProblem, { epsilon: EPSILON });
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

        it('parses empty document', () => {
            // GIVEN
            const planText = '';

            // WHEN
            const parser = new PddlPlanParser(dummyDomain, dummyProblem, { epsilon: EPSILON, minimumPlansExpected: 1 });
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
            const parser = new PddlPlanParser(dummyDomain, dummyProblem, { epsilon: EPSILON, minimumPlansExpected: 1 });
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
            let parser: PddlPlanParser | null = null;
            await new Promise((resolve) => {
                parser = new PddlPlanParser(dummyDomain, dummyProblem, { epsilon: EPSILON, minimumPlansExpected: 1 }, () => resolve());
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
            let parser: PddlPlanParser | null = null;
            await new Promise((resolve) => {
                parser = new PddlPlanParser(dummyDomain, dummyProblem, { epsilon: EPSILON, minimumPlansExpected: 1 }, () => resolve());
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
