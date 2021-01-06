/* --------------------------------------------------------------------------------------------
* Copyright (c) Jan Dolejsi. All rights reserved.
* Licensed under the MIT License. See License.txt in the project root for license information.
* ------------------------------------------------------------------------------------------ */
'use strict';

/* eslint-disable @typescript-eslint/no-use-before-define */

import { SearchState } from "./SearchState";
import { ProblemInfo, DomainInfo, Plan, PlanStep, PlanStepCommitment, HappeningType } from '..';
import { SearchHappening } from "./SearchHappening";
import { equalsCaseInsensitive } from "../utils";

/** Extracts `Plan` from a `SearchState`. */
export class SearchStateToPlan {

    constructor(private readonly domain?: DomainInfo, private readonly problem?: ProblemInfo, private readonly epsilon = 1e-3) { }

    convert(state: SearchState): Plan {

        const totalPlan = state.getTotalPlan();

        // all happenings except for ENDs
        const planStepBuilders = totalPlan
            .filter(happening => happening.kind !== HappeningType.END)
            .map(happening => PlanStepBuilder.fromStart(happening));

        // now associate all ends with the corresponding starts
        totalPlan
            .filter(happening => happening.kind === HappeningType.END)
            .forEach(endHappening => SearchStateToPlan.associate(endHappening, planStepBuilders));

        const planSteps = planStepBuilders.map(step => step.toPlanStep(state.earliestTime, this.epsilon));

        const helpfulActions = state.helpfulActions ?? [];

        return new Plan(planSteps, this.domain, this.problem, state.earliestTime, helpfulActions);
    }

    static associate(endHappening: SearchHappening, planSteps: PlanStepBuilder[]): void {
        const correspondingStart = planSteps.find(step => step.correspondsToEnd(endHappening) && !step.hasEnd());

        if (!correspondingStart) {
            throw new Error("Cannot find start corresponding to: " + endHappening.actionName);
        }

        correspondingStart.setEnd(endHappening);
    }
}

/** Helps pairing corresponding start and end happenings. */
class PlanStepBuilder {
    end: SearchHappening | undefined;

    constructor(public readonly start: SearchHappening) {

    }

    static fromStart(happening: SearchHappening): PlanStepBuilder {
        return new PlanStepBuilder(happening);
    }

    /**
     * Sets corresponding end happening.
     * @param endHappening corresponding end happening
     */
    setEnd(endHappening: SearchHappening): void {
        this.end = endHappening;
    }

    hasEnd(): boolean {
        return !!this.end;
    }

    /**
     * Checks whether the given endHappening corresponds to this start.
     * @param endHappening end happening to test
     */
    correspondsToEnd(endHappening: SearchHappening): boolean {
        const matchingName = equalsCaseInsensitive(this.start.actionName, endHappening.actionName);

        if (!matchingName) { return false; }

        if (endHappening.shotCounter === -1) {
            return this.end === undefined;
        }
        else {
            return this.start.shotCounter === endHappening.shotCounter;
        }
    }

    private getIterations(): number {
        return Math.max(this.start.iterations, this.end?.iterations ?? 1);
    }

    toPlanStep(stateTime: number, epsilon: number): PlanStep {
        const isDurative = this.start.kind === HappeningType.START;

        let duration = epsilon;
        if (isDurative) {
            if (this.end) {
                duration = this.end.earliestTime - this.start.earliestTime;
            }
            else {
                // the end was not set yet (perhaps this was a dead end state and there was no relaxed plan at all)
                duration = stateTime - this.start.earliestTime + stateTime * .1;
            }
        }

        const commitment = this.getCommitment(isDurative);

        return new PlanStep(this.start.earliestTime, this.start.actionName, isDurative, duration, -1, commitment, this.getIterations());
    }

    private getCommitment(isDurative: boolean): PlanStepCommitment {
        if (this.end && !this.end.isRelaxed) { 
            return PlanStepCommitment.Committed; 
        }
        else if (!this.start.isRelaxed) {
            if (isDurative) {
                return PlanStepCommitment.EndsInRelaxedPlan;
            } 
            else {
                return PlanStepCommitment.Committed;
            }
        }
        else {
            return PlanStepCommitment.StartsInRelaxedPlan;
        }
    }
}