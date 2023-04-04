/* --------------------------------------------------------------------------------------------
* Copyright (c) Jan Dolejsi. All rights reserved.
* Licensed under the MIT License. See License.txt in the project root for license information.
* ------------------------------------------------------------------------------------------ */

import { PddlRange, PddlPosition, DocumentPositionResolver } from "./DocumentPositionResolver";
import { PddlBracketNode, PddlSyntaxNode } from "./parser/PddlSyntaxNode";
import { PddlSyntaxTree } from "./parser/PddlSyntaxTree";
import { PddlTokenType } from "./parser/PddlTokenizer";
import { FileStatus, PddlLanguage, Variable } from "./language";
import { URI } from "vscode-uri";
import { Compilations } from "./Compilations";

export function stripComments(pddlText: string): string {
    const lines = pddlText.split(/\r?\n/g);

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const index = line.indexOf(';');
        if (index > -1) {
            lines[i] = line.substring(0, index);
        }
    }

    return lines.join("\n");
}

/**
 * An abstract PDDL file.
 */
export abstract class FileInfo {
    private text?: string;
    private status: FileStatus = FileStatus.Parsed;
    private parsingProblems: ParsingProblem[] = [];
    private requirements?: string[];
    private requirementsNode: PddlBracketNode | undefined;
    private readonly compilations = new Compilations();

    constructor(public readonly fileUri: URI, private version: number, public readonly name: string, public readonly syntaxTree: PddlSyntaxTree, private readonly positionResolver: DocumentPositionResolver) {
    }

    abstract getLanguage(): PddlLanguage;

    getVersion(): number {
        return this.version;
    }

    getText(): string {
        if (this.text) {
            return this.text;
        } else {
            throw new Error('Accessing getText() before file was parsed');
        }
    }

    setText(text: string): void {
        this.text = text;
    }

    isDomain(): boolean {
        return false;
    }
    isProblem(): boolean {
        return false;
    }
    isUnknownPddl(): boolean {
        return false;
    }
    isPlan(): boolean {
        return false;
    }
    isHappenings(): boolean {
        return false;
    }

    update(version: number, text: string, force = false): boolean {
        const isNewerVersion = (version > this.version) || force;
        if (isNewerVersion) {
            this.setStatus(FileStatus.Dirty);
            this.version = version;
            this.text = text;
        }
        return isNewerVersion;
    }

    setStatus(status: FileStatus): void {
        this.status = status;
    }

    getStatus(): FileStatus {
        return this.status;
    }

    /**
     * Adds a parsing problem.
     * @param parsingProblem parsing problems
     */
    addProblem(parsingProblem: ParsingProblem): void {
        this.parsingProblems.push(parsingProblem);
    }

    /**
     * Adds list of parsing problems.
     * @param parsingProblems parsing problems
     */
    addProblems(parsingProblems: ParsingProblem[]): void {
        parsingProblems.forEach(pp => this.addProblem(pp));
    }

    getParsingProblems(): ParsingProblem[] {
        return this.parsingProblems;
    }


    getVariableReferences(variable: Variable): PddlRange[] {

        const referenceLocations: PddlRange[] = [];

        this.syntaxTree.getDefineNode().getChildrenRecursively(node => this.isVariableReference(node, variable),
            node => referenceLocations.push(this.getRange(node)));

        return referenceLocations;
    }

    private isVariableReference(node: PddlSyntaxNode, variable: Variable): boolean {
        if (node.getToken().type !== PddlTokenType.OpenBracket) {
            return false;
        }

        const nonWhiteSpaceChildren = node.getNonWhitespaceChildren();
        if (nonWhiteSpaceChildren.length < 1) {
            return false;
        }
        const variableNameNode = nonWhiteSpaceChildren[0];
        return variableNameNode.getToken().type === PddlTokenType.Other
            && variableNameNode.getToken().tokenText.toLowerCase() === variable.name.toLowerCase();
    }

    getTypeReferences(typeName: string): PddlRange[] {
        if (!this.text) { return []; }
        const referenceLocations: PddlRange[] = [];

        const pattern = `-\\s+${typeName}\\b`;

        const lines = stripComments(this.text).split('\n');

        const regexp = new RegExp(pattern, "gi");
        for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
            const line = lines[lineIdx];
            regexp.lastIndex = 0;
            const match = regexp.exec(line);
            if (match) {
                const range = new PddlRange({
                    start: new PddlPosition(lineIdx, match.index + 2),
                    end: new PddlPosition(lineIdx, match.index + match[0].length)
                });
                referenceLocations.push(range);
            }
        }

        return referenceLocations;
    }

    protected getRange(node: PddlSyntaxNode): PddlRange {
        return this.positionResolver.resolveToRange(node.getStart(), node.getEnd());
    }

    setRequirements(requirements: string[], node?: PddlBracketNode): void {
        this.requirements = requirements;
        this.requirementsNode = node;
    }

    getRequirements(): string[] {
        if (this.requirements) {
            return this.requirements;
        }
        else {
            throw new Error('Accessing getRequirements() before file was parsed');
        }
    }

    getRequirementsNode(): PddlBracketNode | undefined {
        return this.requirementsNode;
    }

    getDocumentPositionResolver(): DocumentPositionResolver {
        return this.positionResolver;
    }
    
    /**
     * @returns code injections, code replacements
     */
    getCompilations(): Compilations {
        return this.compilations;
    }
}

export type ParsingProblemSeverity = "error" | "warning" | "info" | "hint";

/**
 * Parsing problem.
 */
export class ParsingProblem {
    /**
     * Constructs parsing problem.
     * @param problem problem description to display
     * @param severity problem severity
     * @param range range where the problem is
     */
    constructor(public readonly problem: string, public readonly severity: ParsingProblemSeverity, public readonly range: PddlRange) { }
}

export class UnknownFileInfo extends FileInfo {
    constructor(fileUri: URI, version: number, positionResolver: DocumentPositionResolver) {
        super(fileUri, version, "", PddlSyntaxTree.EMPTY, positionResolver);
    }

    getLanguage(): PddlLanguage {
        return PddlLanguage.PDDL;
    }

    isUnknownPddl(): boolean {
        return true;
    }
}
