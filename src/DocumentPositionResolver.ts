/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { PddlSyntaxNode } from "./parser/PddlSyntaxNode";

export class PddlPosition {
    constructor(public readonly line: number, public readonly character: number) {
    }

    atOrBefore(other: PddlPosition): boolean {
        if (this.line === other.line) {
            return this.character <= other.character;
        }
        else {
            return this.line < other.line;
        }
    }

    toString(): string {
        return `${this.line}:${this.character}`;
    }
}

/**
 * This is a local version of the vscode Range class, but because the parser is used in both the extension (client)
 * and the language server, where the Range class is defined separately, we need a single proprietary implementation,
 * which is converted to the VS Code class specific to the two distinct client/server environment. 
 */
export class PddlRange {
    private _start: PddlPosition;
    private _end: PddlPosition;
    constructor(details: { start: PddlPosition; end: PddlPosition }) {
        this._start = details.start;
        this._end = details.end;
    }

    static createRange(details: {
        startLine: number; startCharacter: number;
        endLine: number; endCharacter: number;
    }): PddlRange {
        return new PddlRange({
            start: new PddlPosition(details.startLine, details.startCharacter),
            end: new PddlPosition(details.endLine, details.endCharacter)
        });
    }

    static createSingleCharacterRange(details: { line: number; character: number }): PddlRange {
        const position = new PddlPosition(details.line, details.character);
        return new PddlRange({ start: position, end: position });
    }

    static createSingleLineRange(details: {
        line: number;
        /** Start character */ start: number;
        /** End character */end?: number;
        /** Length */length?: number;
    }): PddlRange {
        if ((details.end ?? details.length) === undefined) {
            throw new Error("Either 'end' or 'length' must be specified.");
        }

        const start = new PddlPosition(details.line, details.start);
        const end = new PddlPosition(details.line, details.end ?? details.start + (details.length ?? 0));
        return new PddlRange({ start, end});
    }

    static createFullLineRange(line: number): PddlRange {
        return new PddlRange({ start: new PddlPosition(line, 0), end: new PddlPosition(line, Number.MAX_VALUE) });
    }

    includes(positionAtOffset: PddlPosition): boolean {
        return this.start.atOrBefore(positionAtOffset) && positionAtOffset.atOrBefore(this.end);
    }

    get start(): PddlPosition {
        return this._start;
    }

    get end(): PddlPosition {
        return this._end;
    }

    toString(): string {
        return `${this.start.toString()}~${this.end.toString()}`
    }
}

/**
 * Abstract document position resolve. It translates document text offsets to Position or Range.
 */
export abstract class DocumentPositionResolver {
    abstract resolveToPosition(offset: number): PddlPosition;

    resolveToRange(start: number, end: number): PddlRange {
        return new PddlRange({ start: this.resolveToPosition(start), end: this.resolveToPosition(end) });
    }

    rangeIncludesOffset(range: PddlRange, offset: number): boolean {
        const positionAtOffset = this.resolveToPosition(offset);

        return range.includes(positionAtOffset);
    }

    nodeToRange(node: PddlSyntaxNode): PddlRange {
        return this.resolveToRange(node.getStart(), node.getEnd());
    }
}

export class SimpleDocumentPositionResolver extends DocumentPositionResolver {
    private readonly lineLengths: number[];

    constructor(readonly documentText: string) {
        super();
        this.lineLengths = this.documentText.split('\n')
            .map(line => line.length + 1);
    }

    resolveToPosition(offset: number): PddlPosition {
        let documentLengthAtCurrentLineStart = 0;
        let documentLengthAtCurrentLineEnd = 0;
        for (let lineIndex = 0; lineIndex < this.lineLengths.length; lineIndex++) {
            const currentLineLength = this.lineLengths[lineIndex];
            documentLengthAtCurrentLineEnd += currentLineLength;

            if (offset >= documentLengthAtCurrentLineStart && offset < documentLengthAtCurrentLineEnd) {
                const character = offset - documentLengthAtCurrentLineStart;
                return new PddlPosition(lineIndex, character);
            }

            documentLengthAtCurrentLineStart = documentLengthAtCurrentLineEnd;
        }

        throw new Error(`Offset ${offset} is outside the document.`);
    }
}
