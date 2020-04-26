/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { Plan } from '../index';
import { PlanningRequestContext } from "./PlannerOptionsProvider";

/**
 * Handles planner response.
 */
export interface PlannerResponseHandler {

    /**
     * Callback to show the output in the output window.
     * @param outputText text captured from the planner process/service output
     */
    handleOutput(outputText: string): void;

    /**
     * Callback to show the plan as soon as the planner finds it.
     * @param plan plan found by the planner
     */
    handlePlan(plan: Plan): void;

    /**
     * Callback to provide planner config options to pass to the planner.
     * This aggregates all the options from all the registered providers.
     * @param request planning request context
     */
    providePlannerOptions(request: PlanningRequestContext): string[];
}