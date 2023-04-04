/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { PddlSyntaxNode } from "./PddlSyntaxNode";
import { Variable, Parameter } from "../language";
import { PddlTokenType, isOpenBracket } from "./PddlTokenizer";
import { PddlRange, DocumentPositionResolver } from "../DocumentPositionResolver";
import { Util } from "../utils/util";

export function parseParameters(fullSymbolName: string): Parameter[] {
    const parameterPattern = /((\?[\w][\w-]*\s+)+)-\s+([\w][\w-]*)/g;

    const parameters: Parameter[] = [];

    let group: RegExpExecArray | null;

    while (group = parameterPattern.exec(fullSymbolName)) {
        const variables = group[1];
        const type = group[3];

        variables.split(/(\s+)/)
            .filter(term => term.trim().length)
            .map(variable => variable.substr(1).trim()) // skip the question-mark
            .forEach(variable => parameters.push(new Parameter(variable, type)));
    }

    return parameters;
}

export function parseVariableDeclaration(fullName: string): Variable {
    const parameters = parseParameters(fullName);
    return new Variable(fullName, parameters);
}

/** Parses the `:predicates` and `:functions` section. */
export class VariablesParser {

    private variables = new Array<Variable>();

    chunks = new Array<PddlSyntaxNode[]>();
    currentVariableNodes = new Array<PddlSyntaxNode>();
    variableNodeEncountered = false;
    consecutiveVerticalWhitespaceCount = 0;

    constructor(predicatesNode: PddlSyntaxNode, private positionResolver: DocumentPositionResolver) {

        // first split the list of children to chunks describing one variable
        this.chunkByVerticalWhitespace(predicatesNode);

        this.variables = Util.flatMap(this.chunks.map(chunk => this.processChunk(chunk)));
    }

    private chunkByVerticalWhitespace(predicatesNode: PddlSyntaxNode): void {
        for (const node of predicatesNode.getNestedChildren()) {
            if (node.getToken().type === PddlTokenType.Whitespace) {
                const verticalWhitespaceCount = node.getText().split(/\r?\n/).length - 1;
                // did we encountered end of the line AFTER the variable declaration?
                if (verticalWhitespaceCount > 0 && this.variableNodeEncountered) {
                    // this is the end of one variable declaration
                    this.addCurrentVariableChunkAndReset();
                }
                this.consecutiveVerticalWhitespaceCount += verticalWhitespaceCount;
                if (this.consecutiveVerticalWhitespaceCount >= 2) {
                    // empty line encountered, reset
                    this.reset();
                }
            }
            else {
                // reset the EOL counter as this is not a vertical whitespace
                this.consecutiveVerticalWhitespaceCount = 0;
                if (isOpenBracket(node.getToken())) {
                    this.variableNodeEncountered = true;
                }
                this.currentVariableNodes.push(node);
            }
        }
        // push the last chunk
        if (this.currentVariableNodes.length) {
            this.addCurrentVariableChunkAndReset();
        }
    }

    private processChunk(chunk: PddlSyntaxNode[]): Variable[] {
        const documentation = new Array<string>();
        const variableNodes: PddlSyntaxNode[] = [];

        for (const node of chunk) {

            if (node.isType(PddlTokenType.Comment)) {
                const indexOfSemicolon = node.getText().indexOf(';');
                if (indexOfSemicolon > -1) {
                    const textAfterSemicolon = node.getText().substr(indexOfSemicolon + 1).trim();
                    documentation.push(textAfterSemicolon);
                }
            }
            else if (isOpenBracket(node.getToken())) {
                variableNodes.push(node);
            }
        }

        return variableNodes.map(node => this.createVariable(node, documentation));
    }

    createVariable(node: PddlSyntaxNode, documentation: string[]): Variable {
        const fullSymbolName = node.getText().replace(/[\(\)]/g, '');
        const variable = parseVariableDeclaration(fullSymbolName);
        variable.setDocumentation(documentation);
        const startPosition = this.positionResolver.resolveToPosition(node.getStart());
        const endPosition = this.positionResolver.resolveToPosition(node.getEnd());
        variable.setLocation(new PddlRange({ start: startPosition, end: endPosition }));

        return variable;
    }

    private addCurrentVariableChunkAndReset(): void {
        this.chunks.push(this.currentVariableNodes);
        this.reset();
    }

    /** Resets the current variable chunk */
    private reset(): void {
        this.currentVariableNodes = [];
        this.variableNodeEncountered = false;
        this.consecutiveVerticalWhitespaceCount = 0;
    }

    static isVerticalWhitespace(node: PddlSyntaxNode): boolean {
        return node.getToken().type === PddlTokenType.Whitespace
            && /[\r\n]/.test(node.getToken().tokenText);
    }

    getVariables(): Variable[] {
        return this.variables;
    }
}
