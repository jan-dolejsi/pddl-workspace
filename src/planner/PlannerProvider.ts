/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi 2020. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { OutputAdaptor } from "../PreProcessors";
import { Authentication } from "./Authentication";
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
    createPlanner?(configuration: PlannerConfiguration, plannerInvocationOptions?: PlannerRunConfiguration): Planner | undefined;

    /** Command-line (or other) options specific to this `Planner` */
    getPlannerOptions?(): PlannerOption[];
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

/** Planner options */
export interface PlannerOption {
    option: string;
    /** Label to show instead of the `option` */
    label?: string;
    /** Documentation to show right from the label/option. */
    description?: string;
}

/** Planner invocation configuration. */
export interface PlannerRunConfiguration {

    // /** Configuration that was used by the planner factory to create this Planner */
    // configuration: PlannerConfiguration;

    // /** Planner provider that was used to create this Planner */
    // provider: PlannerProvider;

    /** Command-line or url query options. */
    options?: string;

    workingDirectory?: string;

    authentication?: Authentication;

    /** `true` if the planner requires command-line interaction */
    requiresKeyboardInput?: boolean;

    /** `true` if the planner supports search debugger call-backs */
    supportsSearchDebugger?: boolean;
}