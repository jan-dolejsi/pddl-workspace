/* --------------------------------------------------------------------------------------------
* Copyright (c) Jan Dolejsi. All rights reserved.
* Licensed under the MIT License. See License.txt in the project root for license information.
* ------------------------------------------------------------------------------------------ */

import { DocumentPositionResolver } from "../DocumentPositionResolver";
import { DomainInfo } from "../DomainInfo";
import { Parameter, Variable } from "../language";
import { PddlInheritanceParser } from "../parser";

export interface SyntaxInjector {
    process(domainInfo: DomainInfo, positionResolver: DocumentPositionResolver): void;
}

export class SyntaxInjectors {

    constructor(private readonly injectors: SyntaxInjector[] = []) {

    }
    
    process(domainInfo: DomainInfo, positionResolver: DocumentPositionResolver) {
        this.injectors.forEach(i => i.process(domainInfo, positionResolver));
    }

    add(injector: SyntaxInjector): void {
        this.injectors.push(injector);
    }
}

export class JobSchedulingSyntaxInjector implements SyntaxInjector {

    public static readonly AVAILABLE = 'available';
    public static readonly RESOURCE = 'resource';
    public static readonly LOCATION = 'location';

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    process(domainInfo: DomainInfo, _positionResolver: DocumentPositionResolver): void {
        if (domainInfo.getRequirements().includes(':job-scheduling')) {

            this.injectTypes(domainInfo);

            this.injectPredicatesAndFunctions(domainInfo);
        }
    }

    private injectPredicatesAndFunctions(domainInfo: DomainInfo) {
        const resourceParam = new Parameter('r', JobSchedulingSyntaxInjector.RESOURCE);
        const locationParam = new Parameter('l', JobSchedulingSyntaxInjector.LOCATION);

        const isAvailable = Variable.from("is_available", [new Parameter("a", JobSchedulingSyntaxInjector.AVAILABLE)]);
        const locatedAt = Variable.from('located_at', [resourceParam, locationParam]);
        const busy = Variable.from('busy', [resourceParam]);
        
        const predicates = [isAvailable, locatedAt, busy];
        const functions: Variable[] = [];

        const resourceTypes = new Set(domainInfo.getTypesInheritingFrom(JobSchedulingSyntaxInjector.RESOURCE));
        // add the 'resource' itself
        resourceTypes.add(JobSchedulingSyntaxInjector.RESOURCE);
        (domainInfo.getJobs() ?? []).forEach(j => {
            const nonResourceParameters = j.parameters.filter(p => !resourceTypes.has(p.type));
            const started = Variable.from(j.name + '_job_started', nonResourceParameters);
            const done = Variable.from(j.name + '_job_done', nonResourceParameters);
            predicates.push(started, done);
            const duration = Variable.from(j.name + '_job_duration', nonResourceParameters);
            functions.push(duration);
        });

        domainInfo.injectPredicates(predicates);
        domainInfo.injectFunctions(functions);
    }

    private injectTypes(domainInfo: DomainInfo) {
        const types = domainInfo.getTypeInheritance();
        types.addEdge(JobSchedulingSyntaxInjector.AVAILABLE, PddlInheritanceParser.OBJECT);
        types.addEdge(JobSchedulingSyntaxInjector.LOCATION, JobSchedulingSyntaxInjector.AVAILABLE);
        types.addEdge(JobSchedulingSyntaxInjector.RESOURCE, JobSchedulingSyntaxInjector.AVAILABLE);
    }
}