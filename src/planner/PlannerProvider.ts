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
    createPlanner?(configuration: PlannerConfiguration, plannerInvocationOptions: PlannerRunConfiguration): Promise<Planner | undefined> | Planner | undefined;

    /** Command-line (or other) options specific to this `Planner` */
    getPlannerOptions?(): PlannerOption[];

    /**
     * Get troubleshooting options. This is called when the planner run fails.
     * @param reason reason of the failure
     * @param failedPlanner planner that failed
     */
     troubleshoot?(failedPlanner: Planner, reason: unknown): TroubleShootingInfo | Promise<TroubleShootingInfo>;
}

/** Planner configuration */
export interface PlannerConfiguration {
    /** planner kind */
    kind: string;
    /** label */
    title: string;
    /** executable path */
    path?: string;
    /** current working directory, if it must be fixed */
    cwd?: string;
    /** command-line syntax */
    syntax?: string;
    /** service url  */
    url?: string;
    /**  user can configure this planner */
    canConfigure: boolean;
    /** Planner support for search debugger call-backs */
    searchDebuggerSupport?: SearchDebuggerSupportType;
    /** Planner command-line option for search debugger callback address. Include the $(port) placeholder to pass the HTTP port. */
    searchDebuggerCommandLineSyntax?: string;
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

    /** Command-line or url query options. */
    options?: string;

    workingDirectory?: string;

    authentication?: Authentication;

    /** `true` if the planner requires command-line interaction */
    requiresKeyboardInput?: boolean;

    /** @deprecated `true` if the planner supports search debugger call-backs */
    supportsSearchDebugger?: boolean;

    /** `true` if the search debugger is active */
    searchDebuggerEnabled?: boolean;

    /** Planner support for search debugger call-backs */
    searchDebuggerPort?: number;
}

/** Communication mechanism between the search debugger and the planner. */
export enum SearchDebuggerSupportType {
    /** Search Debugger not supported. */
    None = "None",
    /** HTTP callback to the port exposed by the Search Debugger. */
    HttpCallback = "HttpCallback",
    /** HTTP Web Socket that the Search Debugger opens after the async request is sent to the planning service. Json format. */
    WebSocketJson = "WebSocketJson",
    /** HTTP Web Socket that the Search Debugger opens after the async request is sent to the planning service. Binary format. */
    WebSocketBinary = "WebSocketBinary",
}

/** Trouble shooting information and options. */
export interface TroubleShootingInfo {
    info: string;
    /** Troubleshooting method names and callbacks to invoke, when elected by the user. */
    options: Map<string, (planner: Planner) => Promise<void>>;
}