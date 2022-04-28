/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi 2020. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import { FileInfo, PddlWorkspaceExtension, PddlLanguage, DocumentPositionResolver } from './src';
import { PddlFileParser, PddlSyntaxTree } from './parser/src';
import { URI } from 'vscode-uri';


/**
 * Custom PDDL file (distinct from PDDL Domain or Problem, but adhering to Lisp syntax).
 */
export class CustomPddlFile extends FileInfo {
    getLanguage(): PddlLanguage {
        return PddlLanguage.PDDL;
    }
}

/**
 * Example Custom PDDL Parser.
 */
export class CustomParser extends PddlFileParser<CustomPddlFile> {
    constructor(private callback?: (fileUri: URI, fileVersion: number) => void) {
        super();
    }
    async tryParse(fileUri: URI, fileVersion: number, fileText: string, syntaxTree: PddlSyntaxTree, positionResolver: DocumentPositionResolver): Promise<CustomPddlFile | undefined> {
        this.callback && this.callback(fileUri, fileVersion);
        if (fileText.includes('(:custom-pddl')) {
            const pddlFile = new CustomPddlFile(fileUri, fileVersion, 'custom', syntaxTree, positionResolver);
            pddlFile.setText(fileText);
            return pddlFile;
        }
        return undefined;
    }
}

/**
 * Example custom PDDL Parser extension.
 */
export class CustomPddlParserExtension implements PddlWorkspaceExtension {
    getPddlParsers(): PddlFileParser<FileInfo>[] | undefined {
        return [new CustomParser()];
    }
}
