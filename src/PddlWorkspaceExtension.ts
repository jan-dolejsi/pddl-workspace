/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi 2020. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { PddlFileParser } from "./parser/PddlFileParser";
import { FileInfo } from "./FileInfo";

/**
 * Manifest of `PddlWorkspace` extension's capabilities.
 */
export abstract class PddlWorkspaceExtension {
    
    /**
     * Implement this to inject a specific PDDL file parser to the `PddlWorkspace`.
     */
    abstract getPddlParsers(): PddlFileParser<FileInfo>[] | undefined;
}