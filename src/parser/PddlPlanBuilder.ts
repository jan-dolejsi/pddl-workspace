/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi 2020. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { Plan } from '../Plan';
import { PlanStep } from '../PlanStep';
import { ProblemInfo } from '../ProblemInfo';
import { DomainInfo } from '../DomainInfo';

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
    constructor(public readonly epsilon: number) { }

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
        if (this.metric !== undefined) {
            plan.metric = this.metric;
        }
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
