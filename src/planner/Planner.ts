/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { DomainInfo , ProblemInfo, Plan, parser } from '../index';
import { PlannerResponseHandler } from './PlannerResponseHandler';

/**
 * Abstract base class for all planners.
 */
export abstract class Planner {

    planningProcessKilled = false;

    constructor(protected readonly plannerPath: string) {

    }

    abstract plan(domain: DomainInfo, problem: ProblemInfo, planParser: parser.PddlPlannerOutputParser, responseHandler: PlannerResponseHandler): Promise<Plan[]>;

    stop(): void {
        this.planningProcessKilled = true;
    }
}
