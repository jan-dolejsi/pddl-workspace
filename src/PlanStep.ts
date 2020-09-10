/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { Happening, HappeningType } from "./HappeningsInfo";

export class PlanStep {
    private actionName: string;
    private objects: string[];

    constructor(private readonly time: number, public readonly fullActionName: string,
        public readonly isDurative: boolean, private readonly duration: number | undefined,
        public readonly lineIndex: number | undefined, public readonly commitment?: PlanStepCommitment,
        private readonly iterations?: number) {
        const nameFragments = fullActionName.split(' ');
        this.actionName = nameFragments[0];
        this.objects = nameFragments.slice(1);
    }

    getActionName(): string {
        return this.actionName;
    }

    getFullActionName(): string {
        return this.fullActionName;
    }

    getObjects(): string[] {
        return this.objects;
    }

    getStartTime(): number {
        return this.time;
    }

    getEndTime(): number {
        return this.isDurative ? this.time + (this.duration ?? Number.NaN) : this.time;
    }

    getDuration(): number | undefined {
        return this.duration;
    }

    getIterations(): number {
        return this.iterations ?? 1;
    }

    equals(other: PlanStep, epsilon: number): boolean {
        if (this.isDurative) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            if (!other.isDurative || !PlanStep.equalsWithin(this.duration!, other.duration!, epsilon)) {
                return false;
            }
        }

        return PlanStep.equalsWithin(this.time, other.time, epsilon)
            && this.fullActionName.toLowerCase() === other.fullActionName.toLowerCase();
    }

    static equalsWithin(a: number, b: number, epsilon: number): boolean {
        return Math.abs(a - b) <= 1.1 * epsilon;
    }

    toPddl(): string {
        let output = "";
        if (this.time !== null && this.time !== undefined) { output += `${this.time.toFixed(5)}: `; }
        output += `(${this.fullActionName})`;
        if (this.isDurative) { output += ` [${this.duration?.toFixed(5)}]`; }
        return output;
    }

    getHappenings(priorSteps: PlanStep[]): Happening[] {
        const count = priorSteps.filter(step => step.fullActionName === this.fullActionName).length;
        const line = priorSteps.length;

        if (this.isDurative) {
            const start = new Happening(this.getStartTime(), HappeningType.START, this.fullActionName, count, line);
            const end = new Happening(this.getEndTime(), HappeningType.END, this.fullActionName, count, line);
            return [start, end];
        } else {
            const instant = new Happening(this.getStartTime(), HappeningType.INSTANTANEOUS, this.fullActionName, count, line);
            return [instant];
        }
    }
}

export enum PlanStepCommitment {
    Committed = "COMMITTED",
    EndsInRelaxedPlan = "ENDS_IN_RELAXED_PLAN",
    StartsInRelaxedPlan = "STARTS_IN_RELAXED_PLAN"
}