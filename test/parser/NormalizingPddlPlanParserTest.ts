/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { describe, it, expect } from 'vitest';
import { PlanStep } from '../src';
import { PddlPlanBuilder, PddlPlanParser, NormalizingPddlPlanParser } from './src';

class TestableNormalizingPddlPlanParser extends NormalizingPddlPlanParser {

    normalizeLine(line: string, lineIdx: number, planParser: PddlPlanParser, planBuilder: PddlPlanBuilder): PlanStep | undefined {
        return super.normalizeLine(line, lineIdx, planParser, planBuilder);
    }
}

describe('NormalizingPddlPlanParser', () => {

    describe('#normalize', () => {

        it('parses epsilon-starting plan', () => {
            // GIVEN
            const makespan = 0.001;
            const cost = 0.12345;
            const states = 1;
            const epsilon = 0.1;
            const endl = '\n';

            const planText = [
                `;;!domain: domain1`,
                `;;!problem: problem1`,
                ``,
                `${epsilon}00: (a)`,
                ``,
                `; Makespan: ${makespan}`,
                `; Cost: ${cost}`,
                `; States evaluated: ${states}`
            ].join(endl);

            // WHEN
            const normalizedPlanText = new NormalizingPddlPlanParser(epsilon).normalize(planText, endl);

            // THEN
            const expected = [`;;!domain: domain1`,
                `;;!problem: problem1`,
                ``,
                `; Normalized plan:`,
                `${epsilon}0000: (a)`,
            ].join(endl);

            expect(normalizedPlanText).to.equal(expected, "normalized plan");
        });
    });

    describe('#normalizeLine', () => {

        it('does not modify epsilon-starting action', () => {
            // GIVEN
            const epsilon = 0.1;

            const planStepText = `${epsilon}00: (a)`;

            // WHEN
            const planParser = new PddlPlanParser();
            const planBuilder = new PddlPlanBuilder(epsilon);
            const actualPlanStep = new TestableNormalizingPddlPlanParser(epsilon).normalizeLine(planStepText, 0, planParser, planBuilder);

            // THEN
            expect(actualPlanStep).to.not.be.undefined;
            expect(actualPlanStep?.getStartTime()).to.equal(epsilon, "start time");
            expect(actualPlanStep?.isDurative).to.equal(false);
        });

        it('does not modify late-starting action', () => {
            // GIVEN
            const epsilon = 0.1;
            const late = 10;
            const duration = 1;
            const planStepText = `${late}: (a) [${duration}]`;

            // WHEN
            const planParser = new PddlPlanParser();
            const planBuilder = new PddlPlanBuilder(epsilon);
            const actualPlanStep = new TestableNormalizingPddlPlanParser(epsilon).normalizeLine(planStepText, 0, planParser, planBuilder);

            // THEN
            expect(actualPlanStep).to.not.be.undefined;
            expect(actualPlanStep?.getStartTime()).to.equal(late, "start time");
            expect(actualPlanStep?.isDurative).to.equal(true);
            expect(actualPlanStep?.getEndTime()).to.equal(late+duration, "end time");
            expect(actualPlanStep?.getDuration()).to.equal(duration, "duration");
        });

        it('does modifies zero-starting action', () => {
            // GIVEN
            const epsilon = 0.1;
            const zero = 0;
            const duration = 1;
            const planStepText = `${zero}: (a) [${duration}]`;

            // WHEN
            const planParser = new PddlPlanParser();
            const planBuilder = new PddlPlanBuilder(epsilon);
            const actualPlanStep = new TestableNormalizingPddlPlanParser(epsilon).normalizeLine(planStepText, 0, planParser, planBuilder);

            // THEN
            expect(actualPlanStep).to.not.be.undefined;
            expect(actualPlanStep?.getStartTime()).to.equal(epsilon, "start time is postponed till epsilon");
            expect(actualPlanStep?.isDurative).to.equal(true);
            expect(actualPlanStep?.getEndTime()).to.equal(epsilon+duration, "end time");
            expect(actualPlanStep?.getDuration()).to.equal(duration, "duration");
        });
    });
});

