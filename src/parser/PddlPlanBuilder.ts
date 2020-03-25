/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi 2020. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { Plan } from '../Plan';
import { PlanStep } from '../PlanStep';
import { ProblemInfo } from '../ProblemInfo';
import { DomainInfo } from '../DomainInfo';
import { PddlPlannerOutputParser } from './PddlPlannerOutputParser';

/**
 * Utility for incremental plan building as it is being parsed.
 */
export class PddlPlanBuilder {
    private statesEvaluated: number | undefined;
    private metric: number | undefined;
    private steps: PlanStep[] = [];
    outputText = ""; // for information only
    parsingPlan = false;
    private makespan = 0;
    constructor(private epsilon: number) { }
    parse(planLine: string, lineIndex: number | undefined): PlanStep | undefined {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        PddlPlannerOutputParser.planStepPattern.lastIndex = 0;
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        const group = PddlPlannerOutputParser.planStepPattern.exec(planLine);
        if (group) {
            // this line is a valid plan step
            const time = group[2] ? parseFloat(group[2]) : this.getMakespan();
            const action = group[3];
            const isDurative = group[5] ? true : false;
            const duration = isDurative ? parseFloat(group[5]) : this.epsilon;
            return new PlanStep(time, action, isDurative, duration, lineIndex);
        }
        else {
            return undefined;
        }
    }
    add(step: PlanStep): void {
        if (this.makespan < step.getEndTime()) {
            this.makespan = step.getEndTime();
        }
        this.steps.push(step);
    }
    getSteps(): PlanStep[] {
        return this.steps;
    }
    build(domain: DomainInfo, problem: ProblemInfo): Plan {
        const plan = new Plan(this.steps, domain, problem);
        plan.statesEvaluated = this.statesEvaluated;
        // if cost was not output by the planning engine, use the plan makespan
        plan.cost = this.metric ?? this.getMakespan();
        return plan;
    }
    getMakespan(): number {
        return this.makespan;
    }
    setMakespan(makespan: number): void {
        this.makespan = makespan;
    }
    getMetric(): number | undefined {
        return this.metric;
    }
    setMetric(metric: number): void {
        this.metric = metric;
    }
    getStatesEvaluated(): number | undefined {
        return this.statesEvaluated;
    }
    setStatesEvaluated(statesEvaluated: number): void {
        this.statesEvaluated = statesEvaluated;
    }
}
