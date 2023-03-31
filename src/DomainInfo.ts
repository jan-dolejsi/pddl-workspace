/* --------------------------------------------------------------------------------------------
* Copyright (c) Jan Dolejsi. All rights reserved.
* Licensed under the MIT License. See License.txt in the project root for license information.
* ------------------------------------------------------------------------------------------ */

import { DirectionalGraph } from "./utils/DirectionalGraph";
import { asSerializable, objToStrMap } from "./utils/serializationUtils";
import { FileInfo } from "./FileInfo";
import { Variable, PddlLanguage, ObjectInstance, Parameter } from "./language";
import { PddlSyntaxTree } from "./parser/PddlSyntaxTree";
import { PddlRange, DocumentPositionResolver, SimpleDocumentPositionResolver } from "./DocumentPositionResolver";
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

    hasObjectCaseInsensitive(objectName: string): boolean {
        return [...this.objects.keys()]
            .some(o => o.toLowerCase() === objectName.toLowerCase());
    }

    hasObject(objectName: string): boolean {
        return this.objects.has(objectName);
    }

    getObjectInstance(objectName: string): ObjectInstance {
        return new ObjectInstance(objectName, this.type);
    }
}

export class TypeObjectMap {
    private typeNameToTypeObjectMap = new Map<string, TypeObjects>();
    private objectNameToTypeObjectMap = new Map<string, TypeObjects>();
    private objectNameCaseInsensitiveToTypeObjectMap = new Map<string, TypeObjects>();

    /**
     * Re-hydrates de-serialized type-object map
     * @param other de-serialized
     */
    static clone(other: unknown): TypeObjectMap {
        const map = new TypeObjectMap();
        const otherMap = objToStrMap(other);
        otherMap.forEach((typeObjects: { type: string; objects: string[] }) => {
            map.addAll(typeObjects.type, typeObjects.objects);
        });

        return map;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    toJSON(_key: string): unknown {
        return asSerializable(this.typeNameToTypeObjectMap);
    }

    get length(): number {
        return this.typeNameToTypeObjectMap.size;
    }

    merge(other: TypeObjectMap): TypeObjectMap {
        const mergedMap = new TypeObjectMap();
        this.valuesArray().concat(other.valuesArray())
            .forEach(typeObj => mergedMap.addAll(typeObj.type, typeObj.getObjects()));
        return mergedMap;
    }

    /**
     * Adds object to type.
     * @param type type name (currently case insensitive)
     * @param objectName object name (currently case sensitive)
     */
    add(type: string, objectName: string): TypeObjectMap {
        this._upsert(type, typeObjects => {
            typeObjects.addObject(objectName);
            // store map of object-to-type
            this.objectNameCaseInsensitiveToTypeObjectMap.set(objectName.toLowerCase(), typeObjects);
            this.objectNameToTypeObjectMap.set(objectName, typeObjects);
        });
        return this;
    }

    addAll(type: string, objects: string[]): TypeObjectMap {
        this._upsert(type, typeObjects => {
            typeObjects.addAllObjects(objects);
            // store map of object-to-type
            objects.forEach(objName => {
                this.objectNameCaseInsensitiveToTypeObjectMap.set(objName.toLowerCase(), typeObjects);
                this.objectNameToTypeObjectMap.set(objName, typeObjects);
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

    /**
     * Returns the `TypeObjects` structure for the lower-cased `type` supplied.
     * @param type case-insensitive type name
     */
    getTypeCaseInsensitive(type: string): TypeObjects | undefined {
        return this.typeNameToTypeObjectMap.get(type.toLowerCase());
    }

    /**
     * Returns the `TypeObjects` structure for a type that has the `objectName` supplied.
     * @param objectName case-sensitive object name
     */
    getTypeOf(objectName: string): TypeObjects | undefined {
        return this.objectNameToTypeObjectMap.get(objectName);
    }

    /**
     * Returns the `TypeObjects` structure for a type that has lower-cased `objectName` supplied.
     * @param objectName case-insensitive object name
     */
    getTypeOfCaseInsensitive(objectName: string): TypeObjects | undefined {
        return this.objectNameCaseInsensitiveToTypeObjectMap.get(objectName.toLowerCase());
    }
}


/**
 * Domain file.
 */
export class DomainInfo extends FileInfo {
    private predicatesNode: PddlBracketNode | undefined;
    private predicates: Variable[] = [];
    private functionsNode: PddlBracketNode | undefined;
    private functions: Variable[] = [];
    private derived: Variable[] = [];
    private actions: Action[] = [];
    private typeInheritance: DirectionalGraph = new DirectionalGraph();
    private typesNode: PddlBracketNode | undefined;
    private typeLocations = new Map<string, PddlRange>();
    private constants: TypeObjectMap = new TypeObjectMap();
    private events?: Action[];
    private processes?: Action[];
    private constraints: Constraint[] = [];

    constructor(fileUri: URI, version: number, domainName: string, readonly syntaxTree: PddlSyntaxTree, positionResolver: DocumentPositionResolver) {
        super(fileUri, version, domainName, syntaxTree, positionResolver);
    }

    /**
     * Copy constructor for re-constructing the domain from a serialized form.
     * @param domain de-serialized domain
     */
    static clone(domain: DomainInfo): DomainInfo {
        const clonedDomain = new DomainInfo(domain.fileUri, Number.NaN, domain.name,
            PddlSyntaxTree.EMPTY, new SimpleDocumentPositionResolver(''))

        clonedDomain.setActions(domain.actions.map(a => this.cloneAction(a)));
        clonedDomain.setConstants(TypeObjectMap.clone(domain.constants));
        clonedDomain.setConstraints(domain.constraints);
        clonedDomain.setDerived(domain.derived);
        domain.events && clonedDomain.setEvents(domain.events);
        clonedDomain.setFunctions(domain.functions, domain.functionsNode);
        clonedDomain.setPredicates(domain.predicates, domain.predicatesNode);
        domain.processes && clonedDomain.setProcesses(domain.processes);
        // todo: domain.requirements && clonedDomain.setRequirements(domain.getRequirements());
        clonedDomain.setTypeInheritance(DirectionalGraph.fromGraph(domain.typeInheritance), domain.typesNode);

        return clonedDomain;
    }

    static cloneAction(action: Action): Action {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const actionAny = action as any;
        if ('duration' in actionAny) {
            return new DurativeAction(action.name, action.parameters, PddlRange.createUnknown());
        } else {
            return new InstantAction(action.name, action.parameters, PddlRange.createUnknown());
        }
    }

    getLanguage(): PddlLanguage {
        return PddlLanguage.PDDL;
    }

    getPredicates(): Variable[] {
        return this.predicates;
    }

    getPredicatesNode(): PddlBracketNode | undefined {
        return this.predicatesNode
    }

    setPredicates(predicates: Variable[], predicatesNode: PddlBracketNode | undefined): void {
        this.predicates = predicates;
        this.predicatesNode = predicatesNode;
    }

    injectPredicates(predicates: Variable[]): void {
        this.predicates.push(...predicates);
    }

    getFunctions(): Variable[] {
        return this.functions;
    }

    getFunctionsNode(): PddlBracketNode | undefined {
        return this.functionsNode;
    }

    setFunctions(functions: Variable[], functionsNode: PddlBracketNode | undefined): void {
        this.functions = functions;
        this.functionsNode = functionsNode;
    }

    injectFunctions(functions: Variable[]): void {
        this.functions.push(...functions);
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

    getJobs(): DurativeAction[] | undefined {
        return this.actions.filter(a => a instanceof Job);
    }

    getStructures(): Action[] {
        const structures = new Array<Action>();
        structures.push(...this.getActions());
        const events = this.getEvents();
        events && structures.push(...events);
        const processes = this.getProcesses();
        processes && structures.push(...processes);
        const jobs = this.getJobs();
        jobs && structures.push(...jobs);
        return structures;
    }

    getTypeInheritance(): DirectionalGraph {
        return this.typeInheritance;
    }

    getTypesNode(): PddlBracketNode | undefined {
        return this.typesNode;
    }

    setTypeInheritance(typeInheritance: DirectionalGraph, typesNode?: PddlBracketNode, positionResolver?: DocumentPositionResolver): void {
        this.typeInheritance = typeInheritance;
        this.typesNode = typesNode;
        if (typesNode && positionResolver) {
            this.getTypes().forEach(typeName => {
                const typeNode = typesNode.getFirstChild(PddlTokenType.Other, new RegExp("^" + typeName + "$"));
                if (typeNode) {
                    const range = new PddlRange({
                        start: positionResolver.resolveToPosition(typeNode.getStart()),
                        end: positionResolver.resolveToPosition(typeNode.getEnd())
                    });
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
        public readonly actionNode?: PddlBracketNode,
        public readonly parametersNode?: PddlBracketNode,
        public readonly duration?: PddlBracketNode,
        public readonly condition?: PddlBracketNode,
        public readonly effect?: PddlBracketNode) {
        super(name, parameters, location);
    }

    isDurative(): boolean {
        return true;
    }
}

export class Job extends DurativeAction {
    constructor(name: string | undefined, parameters: Parameter[], location: PddlRange,
        actionNode?: PddlBracketNode,
        parametersNode?: PddlBracketNode,
        duration?: PddlBracketNode,
        condition?: PddlBracketNode,
        effect?: PddlBracketNode) {
        super(name, parameters, location, actionNode, parametersNode, duration, condition, effect);
    }
}

export class UnrecognizedStructure extends PddlDomainConstruct {
    constructor(range: PddlRange) {
        super("unrecognized", [], range);
    }
}