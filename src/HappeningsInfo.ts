/* --------------------------------------------------------------------------------------------
* Copyright (c) Jan Dolejsi. All rights reserved.
* Licensed under the MIT License. See License.txt in the project root for license information.
* ------------------------------------------------------------------------------------------ */

import { FileInfo } from "./FileInfo";
import { DocumentPositionResolver } from "./DocumentPositionResolver";
import { PddlSyntaxTree } from "./parser/PddlSyntaxTree";
import { PddlLanguage } from "./language";
import { URI } from "vscode-uri";


export enum HappeningType {
    /** Action start. */
    START,
    /** Action end */
    END,
    /** Instantaneous (non-durative) action */
    INSTANTANEOUS,
    /** Timed-action e.g. time-initial literal/fluent. */
    TIMED
}

/**
 * Plan happenings file.
 */
export class HappeningsInfo extends FileInfo {

    private happenings: Happening[] = [];

    constructor(fileUri: URI, version: number, public problemName: string, public domainName: string, text: string, positionResolver: DocumentPositionResolver) {
        super(fileUri, version, problemName, PddlSyntaxTree.EMPTY, positionResolver);
        this.setText(text);
    }

    getLanguage(): PddlLanguage {
        return PddlLanguage.HAPPENINGS;
    }

    setHappenings(happenings: Happening[]): void {
        this.happenings = happenings;
    }

    getHappenings(): Happening[] {
        return this.happenings;
    }

    isHappenings(): boolean {
        return true;
    }
}

/**
 * Single plan happening e.g. a thing that happens at a given time.
 */
export class Happening {
    private actionName: string;
    objects: string[];

    /**
     * Constructs happening instance.
     * @param time happening time
     * @param type happening type
     * @param fullActionName action name including parameter names
     * @param counter same happening counter
     * @param lineIndex line index in the file
     */
    constructor(private time: number, private type: HappeningType,
        private fullActionName: string, public readonly counter: number,
        public readonly lineIndex?: number) {

        const nameFragments = fullActionName.split(' ');
        this.actionName = nameFragments[0];
        this.objects = nameFragments.slice(1);
    }

    /**
     * Happening time.
     */
    getTime(): number {
        return this.time;
    }

    /**
     * Happening type: start/end/instantaneous/til/tif
     */
    getType(): HappeningType {
        return this.type;
    }

    /**
     * Action name without parameters.
     */
    getAction(): string {
        return this.actionName;
    }

    /**
     * Action name with parameters.
     */
    getFullActionName(): string {
        return this.fullActionName;
    }

    /**
     * Counter for the equivalent actions within the same plan.
     */
    getCounter(): number {
        return this.counter;
    }

    /**
     * Returns true if this happening belongs to the other happening.
     * It is decided by comparing the full action name and the counter.
     */
    belongsTo(other: Happening): boolean {
        if (other === null || other === undefined) {
            return false;
        }

        return this.fullActionName === other.fullActionName
            && this.counter === other.counter;
    }

    toString(): string {
        return `${this.time}: ${this.toHappeningType(this.type)} (${this.fullActionName}) #${this.counter}`;
    }

    toHappeningType(type: HappeningType): string {
        switch (type) {
            case HappeningType.START:
                return 'start ';
            case HappeningType.END:
                return 'end ';
            default:
                return '';
        }
    }
}