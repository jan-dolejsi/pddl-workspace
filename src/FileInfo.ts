/* eslint-disable @typescript-eslint/no-use-before-define */
/* --------------------------------------------------------------------------------------------
* Copyright (c) Jan Dolejsi. All rights reserved.
* Licensed under the MIT License. See License.txt in the project root for license information.
* ------------------------------------------------------------------------------------------ */

import { PddlRange, DocumentPositionResolver } from "./DocumentPositionResolver";
import { PddlSyntaxNode } from "./parser/PddlSyntaxNode";
import { PddlSyntaxTree } from "./parser/PddlSyntaxTree";
import { PddlTokenType } from "./parser/PddlTokenizer";

/**
 * An abstract PDDL file.
 */
export abstract class FileInfo {
    private text?: string;
    private status: FileStatus = FileStatus.Parsed;
    private parsingProblems: ParsingProblem[] = [];
    private requirements?: string[];

    constructor(public readonly fileUri: string, private version: number, public readonly name: string, public readonly syntaxTree: PddlSyntaxTree, private readonly positionResolver: DocumentPositionResolver) {
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
        this.parsingProblems = parsingProblems;
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
                const range = new PddlRange(lineIdx, match.index + 2, lineIdx, match.index + match[0].length);
                referenceLocations.push(range);
            }
        }

        return referenceLocations;
    }

    protected getRange(node: PddlSyntaxNode): PddlRange {
        return this.positionResolver.resolveToRange(node.getStart(), node.getEnd());
    }

    setRequirements(requirements: string[]): void {
        this.requirements = requirements;
    }

    getRequirements(): string[] {
        if (this.requirements) {
            return this.requirements;
        }
        else {
            throw new Error('Accessing getRequirements() before file was parsed');
        }
    }

    getDocumentPositionResolver(): DocumentPositionResolver {
        return this.positionResolver;
    }
}

/**
 * Parsing problem.
 */
export class ParsingProblem {
    /**
     * Constructs parsing problem.
     * @param problem problem description to display
     * @param lineIndex zero-based line index, where this problem was found.
     * @param columnIndex zero-based column index, where this problem was found. Default is zero.
     */
    constructor(public problem: string, public lineIndex?: number, public columnIndex: number = 0) { }
}

export enum PddlLanguage {
    // domain or problem
    PDDL,
    // plan (output of the planner)
    PLAN,
    // plan happenings sequence (instantaneous happenings)
    HAPPENINGS
}

/**
 * Status of the file parsing.
 */
export enum FileStatus { Parsed, Dirty, Validating, Validated }

/**
 * State variable.
 */
export class Variable {
    readonly name: string;
    readonly declaredNameWithoutTypes: string;
    private location?: PddlRange; // initialized lazily
    private documentation: string[] = []; // initialized lazily
    private unit = ''; // initialized lazily

    constructor(public readonly declaredName: string, public readonly parameters: Term[] = []) {
        this.declaredNameWithoutTypes = declaredName.replace(/\s+-\s+[\w-_]+/gi, '');
        this.name = declaredName.replace(/( .*)$/gi, '');
    }

    bind(objects: ObjectInstance[]): Variable {
        const objectNames = objects.map(o => o.name).join(" ");
        if (this.parameters.length !== objects.length) {
            throw new Error(`Invalid objects '${objectNames}' for function '${this.getFullName()}' with ${this.parameters.length} parameters.`);
        }
        let fullName = this.name;
        if (objects) { fullName += " " + objectNames; }
        return new Variable(fullName, objects);
    }

    getFullName(): string {
        return this.name + this.parameters.map(par => " " + par.toPddlString()).join('');
    }

    matchesShortNameCaseInsensitive(symbolName: string): boolean {
        return this.name.toLowerCase() === symbolName.toLowerCase();
    }

    isGrounded(): boolean {
        return this.parameters.every(parameter => parameter.isGrounded());
    }

    setDocumentation(documentation: string[]): void {
        this.documentation = documentation;
        const match = documentation.join('\n').match(/\[([^\]]*)\]/);
        if (match) {
            this.unit = match[1];
        }
    }

    getDocumentation(): string[] {
        return this.documentation;
    }

    getUnit(): string {
        return this.unit;
    }

    setLocation(range: PddlRange): void {
        this.location = range;
    }

    getLocation(): PddlRange {
        if (this.location === undefined) { throw new Error('Accessing getLocation() before parsing.'); }
        return this.location;
    }
}


export abstract class Term {
    constructor(public type: string) { }

    abstract toPddlString(): string;

    abstract isGrounded(): boolean;
}

export class Parameter extends Term {
    constructor(public name: string, type: string) {
        super(type);
    }

    toPddlString(): string {
        return `?${this.name} - ${this.type}`;
    }

    isGrounded(): boolean { return false; }
}

export class ObjectInstance extends Term {
    constructor(public name: string, type: string) {
        super(type);
    }

    toPddlString(): string {
        return this.name;
    }

    isGrounded(): boolean { return true; }
}

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