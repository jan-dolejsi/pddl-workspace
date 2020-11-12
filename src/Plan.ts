/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { ProblemInfo } from './ProblemInfo';
import { PlanStep } from './PlanStep';
import { HappeningType } from './HappeningsInfo';
import { DomainInfo } from './DomainInfo';

export class Plan {
    makespan: number;
    statesEvaluated?: number;
    private _cost?: number;

    constructor(public readonly steps: PlanStep[], public readonly domain?: DomainInfo,
        public readonly problem?: ProblemInfo,
        public readonly now?: number,
        public readonly helpfulActions?: HelpfulAction[]) {
        this.makespan = steps.length ? Math.max(...steps.map(step => step.getEndTime())) : 0;
    }

    get cost(): number {
        // if cost was not output by the planning engine, use the plan makespan
        return this._cost ?? this.makespan;
    }

    set cost(cost: number) {
        this._cost = cost;
    }

    isCostDefined(): boolean {
        return this._cost !== undefined;
    }

    /**
     * Returns true if any helpful actions were specified.
     */
    hasHelpfulActions(): boolean {
        return (this.helpfulActions?.length ?? 0) > 0;
    }

    getText(): string {
        return this.steps.map(step => step.toPddl()).join("\n");
    }
}

export interface HelpfulAction {
    actionName: string;
    kind: HappeningType;
}