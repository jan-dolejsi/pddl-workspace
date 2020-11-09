/* --------------------------------------------------------------------------------------------
* Copyright (c) Jan Dolejsi. All rights reserved.
* Licensed under the MIT License. See License.txt in the project root for license information.
* ------------------------------------------------------------------------------------------ */

import { ParsingProblem } from "../FileInfo";
import { Happening, HappeningType } from "../HappeningsInfo";
import { PddlRange } from "../DocumentPositionResolver";

/**
 * Builds the list of happenings while validating the sequence.
 */
export class PlanHappeningsBuilder {
    // all happenings parsed thus far
    private happenings: Happening[] = [];
    // parsing problems to report
    private parsingProblems: ParsingProblem[] = [];
    // plan makespan thus far
    makespan = 0;
    // open actions (action starts that were not matched with an end yet)
    private openActions: Happening[] = [];
    constructor(private epsilon: number) { }
    happeningPattern = /^\s*((\d+|\d+\.\d+|\.\d+)\s*:)?\s*(start|end)?\s*\(([\w -]+)\)\s*(#\d+)?\s*(;.*)?\s*$/;
    whiteSpacePattern = /^\s*(;.*)?\s*$/;
    tryParseFile(fileText: string): void {
        fileText.split('\n')
            .forEach((planLine: string, index: number) => {
                if (!this.isWhiteSpace(planLine)) {
                    this.tryParse(planLine, index);
                }
            });
    }
    isWhiteSpace(planLine: string): boolean {
        this.whiteSpacePattern.lastIndex = 0;
        return this.whiteSpacePattern.exec(planLine) !== null;
    }
    tryParse(planLine: string, lineIndex: number | undefined): void {
        const happening = this.parse(planLine, lineIndex);
        if (happening) {
            this.add(happening);
        }
        else {
            this.parsingProblems.push(
                new ParsingProblem(`Invalid happening syntax: ${planLine}`, "error",
                    PddlRange.createFullLineRange(lineIndex ?? 0)));
        }
    }
    /**
     * Parses single line of plan text.
     * @param planLine line of plan text
     * @param lineIndex line number
     */
    parse(planLine: string, lineIndex: number | undefined): Happening | undefined {
        this.happeningPattern.lastIndex = 0;
        const group = this.happeningPattern.exec(planLine);
        if (group) {
            // this line is a valid plan happening
            const time = group[2] ? parseFloat(group[2]) : this.getMakespan() + this.epsilon;
            const type = this.parseType(group[3]);
            const action = group[4];
            const counter = group[5] ? parseInt(group[5].substring(1)) : 0;
            return new Happening(time, type, action, counter, lineIndex);
        }
        else {
            return undefined;
        }
    }
    add(happening: Happening): void {
        switch (happening.getType()) {
            case HappeningType.START:
                const alreadyExistingStart = this.openActions.concat(this.happenings).find(happening1 => happening1.getType() === HappeningType.START
                    && happening1.belongsTo(happening));
                if (alreadyExistingStart) {
                    this.parsingProblems.push(
                        new ParsingProblem(`A happening matching ${happening.toString()} is already in the plan. Increase the #N counter.`, "error",
                            PddlRange.createFullLineRange(happening.lineIndex ?? 0)));
                }
                this.openActions.push(happening);
                break;
            case HappeningType.END:
                // there must be an open start
                const matchingStart = this.openActions.find(start => start.belongsTo(happening));
                if (matchingStart) {
                    this.openActions.splice(this.openActions.indexOf(matchingStart), 1);
                }
                else {
                    this.parsingProblems.push(
                        new ParsingProblem(`There is no start corresponding to ${happening.toString()}`, "error",
                            PddlRange.createFullLineRange(happening.lineIndex ?? 0)));
                }
                break;
        }
        // adjust the plan makespan
        if (this.makespan < happening.getTime()) {
            this.makespan = happening.getTime();
        }
        else if (this.makespan > happening.getTime()) {
            this.parsingProblems.push(
                new ParsingProblem(`Time must not go backwards.`, "warning",
                    PddlRange.createFullLineRange(happening.lineIndex ?? 0)));
        }
        this.happenings.push(happening);
    }
    validateOpenQueueIsEmpty(): void {
        const problems = this.openActions
            .map(start => new ParsingProblem(`Missing end of ${start.toString()}`, "error",
                PddlRange.createFullLineRange(start.lineIndex ?? 0)));
        this.parsingProblems.push(...problems);
    }
    getHappenings(): Happening[] {
        return this.happenings;
    }
    getMakespan(): number {
        return this.makespan;
    }
    getParsingProblems(): ParsingProblem[] {
        return this.parsingProblems;
    }
    private parseType(typeAsString: string): HappeningType {
        switch (typeAsString) {
            case "start":
                return HappeningType.START;
            case "end":
                return HappeningType.END;
            case undefined:
                return HappeningType.INSTANTANEOUS;
            default:
                throw new Error(`Unexpected happening type: ${typeAsString}`);
        }
    }
}
