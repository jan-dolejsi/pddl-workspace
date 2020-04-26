/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi 2020. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { PddlSyntaxTree } from "./index";
import { DocumentPositionResolver, FileInfo } from "../index";
import { URI } from "vscode-uri";

/**
 * Abstract PDDL file parser. Implement this interface.
 */
export abstract class PddlFileParser<T extends FileInfo> {

    /**
     * Attempt to parse the file content.
     * @param fileUri file uri
     * @param fileVersion content version
     * @param fileText content
     * @param syntaxTree syntax tree
     * @param positionResolver document position resolver
     * @returns `undefined` if the content does not parse in this parser
     */
    abstract tryParse(fileUri: URI, fileVersion: number, fileText: string,
        syntaxTree: PddlSyntaxTree, positionResolver: DocumentPositionResolver): Promise<T | undefined>;
}