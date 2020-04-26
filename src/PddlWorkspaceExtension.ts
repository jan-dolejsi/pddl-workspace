/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi 2020. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { PddlFileParser } from "./parser/PddlFileParser";
import { FileInfo } from "./FileInfo";
import { PlannerProvider } from "./planner/PlannerProvider";

/**
 * Manifest of `PddlWorkspace` extension's capabilities.
 */
export interface PddlWorkspaceExtension {
   
    /**
     * Implement this to inject a specific PDDL file parser to the `PddlWorkspace`.
     */
    getPddlParsers?(): PddlFileParser<FileInfo>[] | undefined;

    /**
     * Implement this to provider a planner specification to the `PddlWorkspace`.
     */
    getPlannerProvider?(): PlannerProvider[] | undefined;
}