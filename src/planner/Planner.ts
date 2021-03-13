/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { DomainInfo , ProblemInfo, Plan, parser } from '../index';
import { PlannerConfiguration, PlannerProvider, PlannerRunConfiguration } from './PlannerProvider';
import { PlannerResponseHandler } from './PlannerResponseHandler';


/** Planner run-time configuration. This serves for troubleshooting run failures.*/
export interface ProviderConfiguration {

    /** Configuration that was used by the planner factory to create this Planner */
    configuration: PlannerConfiguration;

    /** Planner provider that was used to create this Planner */
    provider?: PlannerProvider;
}

/**
 * Abstract base class for all planners.
 */
export abstract class Planner {

    private _planningProcessKilled = false;

    constructor(protected readonly plannerPath: string, protected plannerConfiguration: PlannerRunConfiguration, public readonly providerConfiguration: ProviderConfiguration) {

    }

    /** `true` if the planning run was stopped */
    get planningProcessKilled(): boolean {
        return this._planningProcessKilled;
    }

    get requiresKeyboardInput(): boolean {
        return this.plannerConfiguration.requiresKeyboardInput ?? false;
    }
    /** `true` if the planner supports search debugger call-backs */
    get supportsSearchDebugger(): boolean {
        return this.plannerConfiguration.supportsSearchDebugger ?? true;
    }

    abstract plan(domain: DomainInfo, problem: ProblemInfo, planParser: parser.PddlPlannerOutputParser, responseHandler: PlannerResponseHandler): Promise<Plan[]>;

    stop(): void {
        this._planningProcessKilled = true;
    }
}
