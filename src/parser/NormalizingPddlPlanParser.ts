/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi 2021. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { PlanStep } from "../PlanStep";
import { PddlPlanBuilder } from "./PddlPlanBuilder";
import { PddlPlanParser } from "./PddlPlanParser";

/** Parsers the plan lines, offsets the times (by epsilon, if applicable) and returns the lines normalized. */
export class NormalizingPddlPlanParser {

    private makespan = 0;
    private timeOffset = 0;
    private firstLineParsed = false;

    constructor(private epsilon: number) {

    }

    /**
     * Parses and normalizes the plan text (typically for plan comparison).
     * If the plan starts at time zero, it is shifted to time `epsilon`.
     * 
     * @param origText original plan text
     * @param endl platform-specific end-line characters
     */
    normalize(origText: string, endl: string): string {
        const compare = function (step1: PlanStep, step2: PlanStep): number {
            if (step1.getStartTime() !== step2.getStartTime()) {
                return step1.getStartTime() - step2.getStartTime();
            }
            else {
                return step1.fullActionName.localeCompare(step2.fullActionName);
            }
        };

        const planMeta = PddlPlanParser.parsePlanMeta(origText);
        const planParser = new PddlPlanParser();
        const planBuilder = new PddlPlanBuilder(this.epsilon);

        const normalizedText = PddlPlanParser.getPlanMeta(planMeta.domainName, planMeta.problemName, endl)
            + `${endl}; Normalized plan:${endl}`
            + origText.split('\n')
                .map((origLine, idx) => this.normalizeLine(origLine, idx, planParser, planBuilder))
                .filter(step => step !== undefined)
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                .map(step => step!)
                .sort(compare)
                .map(step => step.toPddl())
                .join(endl);

        return normalizedText;
    }

    protected normalizeLine(line: string, lineIdx: number, planParser: PddlPlanParser, planBuilder: PddlPlanBuilder): PlanStep | undefined {

        const planStep = planParser.parse(line, lineIdx, planBuilder);

        if (!planStep) {
            return undefined;
        } else {
            // this line is a plan step
            const time = planStep.getStartTime();

            if (!this.firstLineParsed) {
                if (time === 0) {
                    this.timeOffset = -this.epsilon;
                }
                this.firstLineParsed = true;
            }

            return new PlanStep(time - this.timeOffset, planStep.getFullActionName(),
                planStep.isDurative, planStep.getDuration(),
                planStep.lineIndex);
        }
    }
}
