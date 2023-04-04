/*
 * Copyright (c) Jan Dolejsi 2023. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 */
'use strict';

import { VariableDeclarationNode } from "./expression";
import { Variable } from "./language";
import { addAllToMapOfLists, addToMapOfLists, split } from "./utils";

export interface CompilationDocumentation {
    /** Documentation text header. */
    title: string,
    /** Markdown documentation text. */
    codeblock?: string,
}

export interface Compilation {
    readonly documentation: CompilationDocumentation;
    readonly offset: number;
    readonly code: string;
    readonly shouldEnsureWhitespaceSeparation: boolean;
    readonly removedCodeLength?: number;
    readonly reason?: string;
}

export class CodeInjection implements Compilation {
    public readonly documentation: CompilationDocumentation;
    public readonly offset: number;
    public readonly code: string;
    public readonly reason: string | undefined;
    private readonly _shouldEnsureWhitespaceSeparation: boolean;

    constructor(options: {
        offset: number, code: string; documentation: CompilationDocumentation;
        doesNotRequireWhitespaceSurrounding?: boolean, reason?: string
    }) {
        this.offset = options.offset;
        this.code = options.code;
        this.documentation = options.documentation;
        this.reason = options.reason;
        this._shouldEnsureWhitespaceSeparation = !options.doesNotRequireWhitespaceSurrounding;
    }

    get shouldEnsureWhitespaceSeparation(): boolean {
        return this._shouldEnsureWhitespaceSeparation;
    }
}

export class PddlCodeInjection extends CodeInjection {

    constructor(options: { offset: number, code: string; documentation: CompilationDocumentation, reason: string }) {
        super({
            offset: options.offset, code: options.code, documentation: options.documentation,
            doesNotRequireWhitespaceSurrounding: options.code.startsWith('(') && options.code.endsWith(')'),
            reason: options.reason,
        });
    }
}

export class VariableDeclarationsInjection extends CodeInjection {
    constructor(documentation: CompilationDocumentation,
        offset: number, public readonly variables: Variable[],
        reason: string | undefined
    ) {
        super({
            offset: offset,
            code: variables.map(v => new VariableDeclarationNode(v).toPddlString()).join(' '),
            documentation: documentation,
            reason: reason,
        });
    }

    get shouldEnsureWhitespaceSeparation(): boolean {
        return false;
    }
}

export class CodeReplacement implements Compilation {
    public readonly documentation: CompilationDocumentation;
    public readonly offset: number;
    public readonly removedCodeLength: number;
    public readonly code: string;
    public readonly reason: string | undefined;

    constructor(options: {
        origCode: string,
        newCode: string,
        documentation: CompilationDocumentation,
        offset: number,
        reason?: string,
    }) {
        this.offset = options.offset;
        this.documentation = options.documentation;
        this.code = options.newCode;
        this.removedCodeLength = options.origCode.length;
        this.reason = options.reason;
    }

    get shouldEnsureWhitespaceSeparation(): boolean {
        return false;
    }
}

/** Container for all code compilation. */
export class Compilations {
    private compilations = new Map<number, Compilation[]>();

    getAll(): Map<number, Compilation[]> {
        return this.compilations;
    }

    public add(compilation: Compilation): void {
        addToMapOfLists(this.compilations, compilation.offset, compilation);
    }

    public addAll(index: number, injections: Compilation[]): void {
        addAllToMapOfLists(this.compilations, index, injections);
    }

    /**
     * Applies all code compilations.
     * @param input original code
     * @returns resulting code with all the compilations
     */
    public applyAll(input: string): string {
        const output = [...this.compilations.keys()]
            .sort((a, b) => a - b)
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            .reduceRight((input1, offset) => this.applyAt(input1, offset, this.compilations.get(offset)!), input);
        return output;
    }

    /**
     * Applies all compilations at `offset` and return the output.
     */
    private applyAt(input: string, offset: number, compilations: Compilation[]): string {
        // we should first apply replacements before we apply injections for the consistency 
        const replacementsFirst = split(compilations, (c) => c instanceof CodeReplacement);

        const output = replacementsFirst.reduce((input1, compilations) =>
            compilations.reduceRight((input2, compilation) => this.applyOne(input2, offset, compilation), input1),
            input);

        return output;
    }

    private applyOne(input: string, offset: number, compilation: Compilation): string {
        let code = compilation.code;

        // prepend by space, if there is none
        if (compilation.shouldEnsureWhitespaceSeparation
            && offset > 0 && (input.charAt(offset - 1) !== ' ')) {
            code = ' ' + code;
        }

        // append space, if there is none
        if (compilation.shouldEnsureWhitespaceSeparation
            && offset < input.length && ![' ', ')'].includes(input.charAt(offset))) {
            code = code + ' ';
        }

        return input.substring(0, offset) + code + input.substring(offset + (compilation.removedCodeLength ?? 0));
    }
}

