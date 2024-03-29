/* --------------------------------------------------------------------------------------------
* Copyright (c) Jan Dolejsi 2020. All rights reserved.
* Licensed under the MIT License. See License.txt in the project root for license information.
* ------------------------------------------------------------------------------------------ */

import { PddlRange } from "./DocumentPositionResolver";

// Language ID of Domain and Problem files
export const PDDL = 'pddl';
// Language ID of Plan files
export const PLAN = 'plan';
// Language ID of Happenings files
export const HAPPENINGS = 'happenings';


export enum PddlLanguage {
    // domain or problem
    PDDL,
    // plan (output of the planner)
    PLAN,
    // plan happenings sequence (instantaneous happenings)
    HAPPENINGS
}

const languageMap = new Map<string, PddlLanguage>([
    [PDDL, PddlLanguage.PDDL],
    [PLAN, PddlLanguage.PLAN],
    [HAPPENINGS, PddlLanguage.HAPPENINGS]
]);

export function toLanguageFromId(languageId: string): PddlLanguage | undefined {
    return languageMap.get(languageId);
}

/**
 * Status of the file parsing.
 */
export enum FileStatus {
    /** File is parsed when the FileInfo object is created. */
    Parsed,
    /** File was parsed before, but was updated, but not re-parsed yet. */
    Dirty,
    /** Running external language-specific deep parser/validator.  */
    Validating,
    /** Finished running external language-specific deep parser/validator.  */
    Validated
}

/**
 * State variable.
 */
export class Variable {
    readonly name: string;
    readonly declaredNameWithoutTypes: string;
    private location?: PddlRange; // initialized lazily
    private documentation: string[] = []; // initialized lazily
    private unit = ''; // initialized lazily

    /** @deprecated use one of the fromXyz methods or parseVariableDeclaration(fullName) function*/
    constructor(public readonly declaredName: string, public readonly parameters: Term[] = []) {
        this.declaredNameWithoutTypes = declaredName.replace(/\s+-\s+[\w-_]+/gi, '');
        this.name = declaredName.replace(/( .*)$/gi, '');
    }

    static from(name: string, terms: Term[]): Variable {
        let fullName = name;
        if (terms.length) {
            terms.forEach(t => fullName+= ' ' + t.toPddlString())
        }
        return new Variable(fullName, terms);
    }

    static fromGrounded(fullName: string): Variable {
        const fragments = fullName.split(/\s+/);
        const name = fragments.shift();
        if (!name) {
            throw new Error(`Illegal grounded variable name: ${fullName}`);
        }

        const terms = fragments
            .map(o => new ObjectInstance(o, "object"));
        
        return new Variable(name, terms); 
    }

    ground(objects: ObjectInstance[]): Variable {
        const objectNames = objects.map(o => o.name).join(" ");
        if (this.parameters.length !== objects.length) {
            throw new Error(`Invalid objects '${objectNames}' for function '${this.getFullName()}' with ${this.parameters.length} parameters.`);
        }
        let fullName = this.name;
        if (objects) { fullName += " " + objectNames; }
        return new Variable(fullName, objects);
    }

    bind(parameters: Parameter[]): Variable {
        const paramDefs = parameters.map(o => o.toPddlString()).join(" ");
        if (this.parameters.length !== parameters.length) {
            throw new Error(`Invalid parameters '${paramDefs}' for function '${this.getFullName()}' with ${this.parameters.length} parameters.`);
        }
        let fullName = this.name;
        if (parameters) { fullName += " " + paramDefs; }
        return new Variable(fullName, parameters);
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

    getLocation(): PddlRange | undefined {
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

    object(objectName: string): ObjectInstance {
        return new ObjectInstance(objectName, this.type);
    }

    isGrounded(): boolean { return false; }

    toPddlString(): string {
        return `?${this.name} - ${this.type}`;
    }

    static createPddlString(...params: Parameter[]): string {
        if (params.length === 0) {
            return '';
        }
        
        let lastType = params[0].type;

        const output = [];

        const addType = (type: string) => output.push('- ' + type);

        for (const p of params) {
            if (p.type !== lastType) {
                addType(lastType);
            }
            lastType = p.type;
            output.push('?' + p.name);
        }

        addType(lastType);
        
        return output.join(' ');
    }
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
