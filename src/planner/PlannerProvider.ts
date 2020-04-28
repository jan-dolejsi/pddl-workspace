/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi 2020. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { OutputAdaptor } from "../PreProcessors";
import { Planner } from "./Planner";
import { PlannerKind } from "./PlannerRegistrar";

/**
 * Planner/configuration provider.
 */
export interface PlannerProvider {

    /** Planner kind */
    kind: PlannerKind;

    /**
     * Label to show in the quick input menu.
     */
    getNewPlannerLabel(): string;

    /**
     * Takes the user through the configuration of the planner.
     * @param previousConfiguration current configuration. This is `undefined`, if the user is configuring a new planner.
     */
    configurePlanner(previousConfiguration?: PlannerConfiguration): Promise<PlannerConfiguration | undefined>;

    /** Optional usage output. */
    showHelp?(output: OutputAdaptor): void;

    /** Custom `Planner` implementation. */
    createPlanner?(): Planner;
}

/** Planner configuration */
export interface PlannerConfiguration {
    /** planner kind */
    kind: string;
    /** label */
    title: string;
    /** executable path */
    path?: string;
    /** command-line syntax */
    syntax?: string;
    /** service url  */
    url?: string;
    /**  user can configure this planner */
    canConfigure: boolean;
}