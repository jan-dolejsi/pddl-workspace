/* --------------------------------------------------------------------------------------------
* Copyright (c) Jan Dolejsi. All rights reserved.
* Licensed under the MIT License. See License.txt in the project root for license information.
* ------------------------------------------------------------------------------------------ */

import { DirectionalGraph } from "./utils/DirectionalGraph";
import { FileInfo } from "./FileInfo";
import { Variable, PddlLanguage, ObjectInstance, Parameter } from "./language";
import { PddlSyntaxTree } from "./parser/PddlSyntaxTree";
import { PddlRange, DocumentPositionResolver } from "./DocumentPositionResolver";
import { PddlBracketNode } from "./parser/PddlSyntaxNode";
import { PddlTokenType } from "./parser/PddlTokenizer";
import { Constraint } from "./constraints";
import { URI } from "vscode-uri";


/**
 * Holds objects belonging to the same type.
 */
export class TypeObjects {
    private objects = new Set<string>();

    constructor(public readonly type: string) { }

    getObjects(): string[] {
        return [...this.objects.keys()];
    }

    addObject(obj: string): TypeObjects {
        this.objects.add(obj);
        return this;
    }

    addAllObjects(objects: string[]): TypeObjects {
        objects.forEach(o => this.addObject(o));

        return this;
    }

    hasObject(objectName: string): boolean {
        return [...this.objects.keys()]
            .some(o => o.toLowerCase() === objectName.toLowerCase());
    }

    getObjectInstance(objectName: string): ObjectInstance {
        return new ObjectInstance(objectName, this.type);
    }
}

export class TypeObjectMap {
    private typeNameToTypeObjectMap = new Map<string, TypeObjects>();
    private objectNameToTypeObjectMap = new Map<string, TypeObjects>();

    get length(): number {
        return this.typeNameToTypeObjectMap.size;
    }

    merge(other: TypeObjectMap): TypeObjectMap {
        const mergedMap = new TypeObjectMap();
        this.valuesArray().concat(other.valuesArray())
            .forEach(typeObj => mergedMap.addAll(typeObj.type, typeObj.getObjects()));
        return mergedMap;
    }

    add(type: string, objectName: string): TypeObjectMap {
        this._upsert(type, typeObjects => {
            typeObjects.addObject(objectName);
            // store map of object-to-type
            this.objectNameToTypeObjectMap.set(objectName.toLowerCase(), typeObjects);
        });
        return this;
    }

    addAll(type: string, objects: string[]): TypeObjectMap {
        this._upsert(type, typeObjects => {
            typeObjects.addAllObjects(objects);
            // store map of object-to-type
            objects.forEach(objName => {
                this.objectNameToTypeObjectMap.set(objName.toLowerCase(), typeObjects);
            });
        });

        return this;
    }

    private _upsert(type: string, inserter: (typeObjects: TypeObjects) => void): void {
        const typeFound = this.getTypeCaseInsensitive(type) ?? new TypeObjects(type);

        inserter.apply(this, [typeFound]);

        this.typeNameToTypeObjectMap.set(type.toLowerCase(), typeFound);
    }

    private valuesArray(): TypeObjects[] {
        return [...this.typeNameToTypeObjectMap.values()];
    }

    getTypeCaseInsensitive(type: string): TypeObjects | undefined {
        return this.typeNameToTypeObjectMap.get(type.toLowerCase());
    }

    getTypeOf(objectName: string): TypeObjects | undefined {
        return this.objectNameToTypeObjectMap.get(objectName.toLowerCase());
    }
}


/**
 * Domain file.
 */
export class DomainInfo extends FileInfo {
    private predicates: Variable[] = [];
    private functions: Variable[] = [];
    private derived: Variable[] = [];
    private actions: Action[] = [];
    private typeInheritance: DirectionalGraph = new DirectionalGraph();
    private typeLocations = new Map<string, PddlRange>();
    private constants: TypeObjectMap = new TypeObjectMap();
    private events?: Action[];
    private processes?: Action[];
    private constraints: Constraint[] = [];

    constructor(fileUri: URI, version: number, domainName: string, readonly syntaxTree: PddlSyntaxTree, positionResolver: DocumentPositionResolver) {
        super(fileUri, version, domainName, syntaxTree, positionResolver);
    }

    getLanguage(): PddlLanguage {
        return PddlLanguage.PDDL;
    }

    getPredicates(): Variable[] {
        return this.predicates;
    }

    setPredicates(predicates: Variable[]): void {
        this.predicates = predicates;
    }

    getFunctions(): Variable[] {
        return this.functions;
    }

    setFunctions(functions: Variable[]): void {
        this.functions = functions;
    }

    getFunction(liftedVariableName: string): Variable | undefined {
        return this.functions
            .find(variable => variable.name.toLocaleLowerCase() === liftedVariableName.toLocaleLowerCase());
    }

    getLiftedFunction(groundedVariable: Variable): Variable | undefined {
        return this.getFunction(groundedVariable.name);
    }

    getDerived(): Variable[] {
        return this.derived;
    }

    setDerived(derived: Variable[]): void {
        this.derived = derived;
    }

    setActions(actions: Action[]): void {
        this.actions = actions;
    }

    getActions(): Action[] {
        return this.actions;
    }

    getStructures(): Action[] {
        const structures = new Array<Action>();
        structures.push(...this.getActions());
        const events = this.getEvents();
        if (events) {
            structures.push(...events);
        }
        const processes = this.getProcesses();
        if (processes) {
            structures.push(...processes);
        }
        return structures;
    }

    getTypeInheritance(): DirectionalGraph {
        return this.typeInheritance;
    }

    setTypeInheritance(typeInheritance: DirectionalGraph, typesNode?: PddlBracketNode, positionResolver?: DocumentPositionResolver): void {
        this.typeInheritance = typeInheritance;
        if (typesNode && positionResolver) {
            this.getTypes().forEach(typeName => {
                const typeNode = typesNode.getFirstChild(PddlTokenType.Other, new RegExp("^" + typeName + "$"));
                if (typeNode) {
                    const range = PddlRange.from(positionResolver.resolveToPosition(typeNode.getStart()), positionResolver.resolveToPosition(typeNode.getEnd()));
                    this.typeLocations.set(typeName, range);
                }
            });
        }
    }

    setConstants(constants: TypeObjectMap): void {
        this.constants = constants;
    }

    getConstants(): TypeObjectMap {
        return this.constants;
    }

    getTypes(): string[] {
        return this.typeInheritance.getVertices()
            .filter(t => t.toLowerCase() !== "object");
    }

    getTypesInclObject(): string[] {
        return this.typeInheritance.getVertices();
    }

    isDomain(): boolean {
        return true;
    }

    getTypesInheritingFrom(type: string): string[] {
        return this.typeInheritance.getSubtreePointingTo(type);
    }

    getEvents(): Action[] | undefined {
        return this.events;
    }

    setEvents(events: Action[]): void {
        this.events = events;
    }

    getProcesses(): Action[] | undefined {
        return this.processes;
    }

    setProcesses(processes: Action[]): void {
        this.processes = processes;
    }

    getConstraints(): Constraint[] {
        return this.constraints;
    }

    setConstraints(constraints: Constraint[]): void {
        this.constraints = constraints;
    }

    TYPES_SECTION_START = "(:types";

    getTypeLocation(type: string): PddlRange | undefined {
        return this.typeLocations.get(type);
    }
}

export abstract class PddlDomainConstruct {
    private documentation: string[] = []; // initialized lazily

    constructor(public readonly name: string | undefined, public readonly parameters: Parameter[],
        public readonly location: PddlRange) {

    }

    getLocation(): PddlRange {
        return this.location;
    }

    setDocumentation(documentation: string[]): void {
        this.documentation = documentation;
    }

    getDocumentation(): string[] {
        return this.documentation;
    }

    getNameOrEmpty(): string {
        return this.name ?? '';
    }
}

export abstract class Action extends PddlDomainConstruct {

    abstract isDurative(): boolean;
}

export class InstantAction extends Action {
    constructor(name: string | undefined, parameters: Parameter[], location: PddlRange,
        public readonly preCondition?: PddlBracketNode, public readonly effect?: PddlBracketNode) {
        super(name, parameters, location);
    }

    isDurative(): boolean {
        return false;
    }
}

export class DurativeAction extends Action {
    constructor(name: string | undefined, parameters: Parameter[], location: PddlRange,
        public readonly duration?: PddlBracketNode,
        public readonly condition?: PddlBracketNode,
        public readonly effect?: PddlBracketNode) {
        super(name, parameters, location);
    }

    isDurative(): boolean {
        return true;
    }
}

export class UnrecognizedStructure extends PddlDomainConstruct {
    constructor(range: PddlRange) {
        super("unrecognized", [], range);
    }
}