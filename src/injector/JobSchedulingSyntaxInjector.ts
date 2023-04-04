/* --------------------------------------------------------------------------------------------
* Copyright (c) Jan Dolejsi. All rights reserved.
* Licensed under the MIT License. See License.txt in the project root for license information.
* ------------------------------------------------------------------------------------------ */

import { DocumentPositionResolver } from "../DocumentPositionResolver";
import { Action, DomainInfo, DurativeAction } from "../DomainInfo";
import { CodeInjection, CodeReplacement, Compilation, PddlCodeInjection, VariableDeclarationsInjection } from "../Compilations";
import { DurationExpressionNode, EqualityNode, ExpressionNode, VariableNode, and, atEnd, atStart, expression, not, overAll } from "../expression";
import { Parameter, Variable } from "../language";
import { PddlBracketNode, PddlInheritanceParser } from "../parser";
import { BaseSyntaxInjector, InjectionPosition } from "./SyntaxInjector";

/** Injects auto-generated code triggered by the :job-scheduling requirement/ontology. */
export class JobSchedulingSyntaxInjector extends BaseSyntaxInjector {

    /* TYPES */
    public static readonly AVAILABLE = 'available';
    public static readonly RESOURCE = 'resource';
    public static readonly LOCATION = 'location';

    /* PREDICATE NAMES */
    private static readonly IS_AVAILABLE_PREDICATE_NAME = 'is_available';
    private static readonly IS_AVAILABLE_PREDICATE = new Variable(JobSchedulingSyntaxInjector.IS_AVAILABLE_PREDICATE_NAME, [
        new Parameter('a', JobSchedulingSyntaxInjector.AVAILABLE)
    ]);
    private static readonly LOCATED_AT_PREDICATE_NAME = 'located_at';
    /** (located_at ?r - resource ?l - location) */
    private static readonly LOCATED_AT_PREDICATE = new Variable(JobSchedulingSyntaxInjector.LOCATED_AT_PREDICATE_NAME, [
        new Parameter('r', JobSchedulingSyntaxInjector.RESOURCE),
        new Parameter('l', JobSchedulingSyntaxInjector.LOCATION)
    ]);
    private static readonly BUSY_PREDICATE_NAME = 'busy';
    /** (busy ?r - resource) */
    private static readonly BUSY_PREDICATE = new Variable(JobSchedulingSyntaxInjector.BUSY_PREDICATE_NAME, [
        new Parameter('r', JobSchedulingSyntaxInjector.RESOURCE)
    ]);
    private static readonly JOB_STARTED_SUFFIX = '_job_started';
    private static readonly JOB_DONE_SUFFIX = '_job_done';

    /* FUNCTION NAMES */
    static readonly JOB_DURATION_SUFFIX = '_job_duration';
    private static readonly TRAVEL_TIME = 'travel_time';
    /** (travel_time ?r - resource ?from ?to - location) */
    private static readonly TRAVEL_TIME_FUNCTION = new Variable(JobSchedulingSyntaxInjector.TRAVEL_TIME, [
        new Parameter('r', JobSchedulingSyntaxInjector.RESOURCE),
        new Parameter('from', JobSchedulingSyntaxInjector.LOCATION),
        new Parameter('to', JobSchedulingSyntaxInjector.LOCATION)
    ]);

    private static readonly JOB_SCHEDULING = ':job-scheduling';
    /** PDDL Requirements that are implied by the :job-scheduling and therefore should be inserted in its place */
    private static readonly JOB_SCHEDULING_IMPLIED_REQS = [
        ':strips', ':fluents', ':durative-actions', ':typing', ':negative-preconditions'];

    process(domainInfo: DomainInfo, positionResolver: DocumentPositionResolver): void {
        if (!domainInfo.getRequirements().includes(JobSchedulingSyntaxInjector.JOB_SCHEDULING)) {
            return;
        }

        this.replaceRequirement(domainInfo, positionResolver);

        this.injectTypes(domainInfo, positionResolver);

        this.injectPredicatesAndFunctions(domainInfo, positionResolver);

        if (!domainInfo.getActions().find(a => a.name === 'move')) {
            this.injectMoveAction(domainInfo, positionResolver);
        }
    }

    private replaceRequirement(domainInfo: DomainInfo, positionResolver: DocumentPositionResolver): void {
        const origRequirements = new Set(domainInfo.getRequirements());
        const replacementRequirements = JobSchedulingSyntaxInjector.JOB_SCHEDULING_IMPLIED_REQS
            .filter(r => !origRequirements.has(r))
            .join(' ');
        
        const requirementsNode = domainInfo.getRequirementsNode();
        if (!requirementsNode) {
            return;
        }

        const jobSchedulingNode = requirementsNode.getChildren()
            .find(node => node.getToken().tokenText.toLowerCase() === ':job-scheduling');
        
        if (!jobSchedulingNode) {
            return;
        }
        
        const replacement = new CodeReplacement({
            origCode: jobSchedulingNode.getToken().tokenText,
            newCode: replacementRequirements,
            documentation: { title: 'Implied requirements' },
            offset: this.getOffset(jobSchedulingNode as PddlBracketNode, positionResolver, { position: InjectionPosition.OutsideStart }),
            reason: JobSchedulingSyntaxInjector.JOB_SCHEDULING,
        });

        domainInfo.getCompilations().add(replacement);
    }

    private injectPredicatesAndFunctions(domainInfo: DomainInfo, positionResolver: DocumentPositionResolver): void {

        const predicates = [
            JobSchedulingSyntaxInjector.IS_AVAILABLE_PREDICATE,
            JobSchedulingSyntaxInjector.LOCATED_AT_PREDICATE,
            JobSchedulingSyntaxInjector.BUSY_PREDICATE];
        const functions = [
            JobSchedulingSyntaxInjector.TRAVEL_TIME_FUNCTION];

        const resourceTypes = new Set(domainInfo.getTypesInheritingFromPlusSelf(JobSchedulingSyntaxInjector.RESOURCE));
        const locationTypes = new Set(domainInfo.getTypesInheritingFromPlusSelf(JobSchedulingSyntaxInjector.LOCATION));

        const jobDecorations = (domainInfo.getJobs() ?? [])
            .map(j => this.compileJob(j, locationTypes, resourceTypes, positionResolver))

        jobDecorations.forEach(jd => {
            predicates.push(...jd.generatedPredicates);
            functions.push(...jd.generatedFunctions);
        });

        const predicatesNode = domainInfo.getPredicatesNode();
        domainInfo.injectPredicates(new VariableDeclarationsInjection(
            { title: this.createHoverTitle('Predicates') },
            this.getOffset(predicatesNode, positionResolver, { position: InjectionPosition.InsideEnd }),
            predicates, JobSchedulingSyntaxInjector.JOB_SCHEDULING));
        const functionsNode = domainInfo.getFunctionsNode();
        domainInfo.injectFunctions(new VariableDeclarationsInjection(
            { title: this.createHoverTitle('Functions') },
            this.getOffset(functionsNode, positionResolver, { position: InjectionPosition.InsideEnd }),
            functions, JobSchedulingSyntaxInjector.JOB_SCHEDULING));

        jobDecorations
            .flatMap(jd => jd.injections)
            .forEach(i => domainInfo.getCompilations().add(i));
    }

    private injectTypes(domainInfo: DomainInfo, positionResolver: DocumentPositionResolver): void {
        const types = domainInfo.getTypeInheritance();
        types.addEdge(JobSchedulingSyntaxInjector.AVAILABLE, PddlInheritanceParser.OBJECT);
        types.addEdge(JobSchedulingSyntaxInjector.LOCATION, JobSchedulingSyntaxInjector.AVAILABLE);
        types.addEdge(JobSchedulingSyntaxInjector.RESOURCE, JobSchedulingSyntaxInjector.AVAILABLE);

        const typesNode = domainInfo.getTypesNode();
        const hover = this.createHoverTitle('Types');
        if (typesNode) {
            domainInfo.getCompilations().add(new PddlCodeInjection({
                documentation: { title: hover },
                offset: this.getOffset(typesNode, positionResolver, { position: InjectionPosition.InsideStart }),
                code: `${JobSchedulingSyntaxInjector.LOCATION} ${JobSchedulingSyntaxInjector.RESOURCE} - ${JobSchedulingSyntaxInjector.AVAILABLE}`,
                reason: JobSchedulingSyntaxInjector.JOB_SCHEDULING,
            }));
        } else {
            const precedingNode = domainInfo.getRequirementsNode();
            precedingNode && domainInfo.getCompilations().add(new PddlCodeInjection({
                documentation: { title: hover },
                offset: this.getOffset(precedingNode, positionResolver, { position: InjectionPosition.OutsideEnd }),
                code: `${JobSchedulingSyntaxInjector.LOCATION} ${JobSchedulingSyntaxInjector.RESOURCE} - ${JobSchedulingSyntaxInjector.AVAILABLE}`,
                reason: JobSchedulingSyntaxInjector.JOB_SCHEDULING,
            }));
        }
    }

    compileJob(job: DurativeAction, locationTypes: Set<string>, resourceTypes: Set<string>,
        positionResolver: DocumentPositionResolver): JobDecoration {

        const decoration = new JobDecoration();

        const actionNode = job.actionNode;
        if (!actionNode) {
            return decoration;
        }

        // replace :job by :durative-action
        decoration.add(new CodeReplacement({
            origCode: actionNode.getToken().tokenText,
            newCode: ':durative-action ',
            offset: actionNode.getStart() + 1,
            documentation: {
                title: 'Job is a simplified durative action', codeblock: `:durative-action`,
            }, 
            reason: JobSchedulingSyntaxInjector.JOB_SCHEDULING
        }));

        if (!job.duration && job.parametersNode) {
            const durationDef = ':duration ' + new EqualityNode(new DurationExpressionNode(), new VariableNode(decoration.createDurationVariable(job, resourceTypes))).toPddlString();
            decoration.add(new PddlCodeInjection({
                offset: this.getOffset(job.parametersNode, positionResolver, { position: InjectionPosition.OutsideEnd }),
                code: durationDef,
                documentation: { title: 'Suggested job duration definition', codeblock: durationDef },
                reason: JobSchedulingSyntaxInjector.JOB_SCHEDULING,
            }));
        }

        const availabilityVariables: Variable[] = [];

        // the location shall be available
        const locationParameter = job.parameters.find(p => locationTypes.has(p.type));
        if (locationParameter) {
            const locationIsAvailable = JobSchedulingSyntaxInjector.IS_AVAILABLE_PREDICATE.bind([locationParameter]);
            availabilityVariables.push(locationIsAvailable);
        }

        const resourcesAtLocation: Variable[] = [];

        // all resources shall be available and at the location
        job.parameters
            .filter(p => resourceTypes.has(p.type))
            .forEach(p => {
                const resourceIsAvailable = JobSchedulingSyntaxInjector.IS_AVAILABLE_PREDICATE.bind([p]);
                availabilityVariables.push(resourceIsAvailable);

                if (locationParameter) {
                    const resourceAtLocation = JobSchedulingSyntaxInjector.LOCATED_AT_PREDICATE.bind([p, locationParameter]);
                    resourcesAtLocation.push(resourceAtLocation);
                }
            });

        const conditions = [...availabilityVariables.map(v => overAll(expression(v)))];
        conditions.push(...resourcesAtLocation.map(p => overAll(expression(p))));

        const jobStarted = decoration.createActionPredicate(job, JobSchedulingSyntaxInjector.JOB_STARTED_SUFFIX, resourceTypes);
        const jobDone = decoration.createActionPredicate(job, JobSchedulingSyntaxInjector.JOB_DONE_SUFFIX, resourceTypes);

        conditions.push(
            atStart(not(jobStarted)),
            atStart(not(jobDone)),
        );

        const effects: ExpressionNode[] = [];
        effects.push(
            atStart(expression(jobStarted)),
            atEnd(expression(jobDone)),
        );

        availabilityVariables.forEach(e => {
            effects.push(atStart(not(e)));
            effects.push(atEnd(expression(e)));
        });

        const conditionDocumentation = {
            title: 'Auto-generated conditions',
            codeblock: conditions.map(c => c.toPddlString()).join('\n'),
        };

        if (job.condition) {
            const conjunction = job.condition.getFirstOpenBracket('and');
            if (conjunction) {
                // inject into the :condition (and ...) conjunction
                decoration.add(new PddlCodeInjection({
                    offset: this.getOffset(conjunction, positionResolver, { position: InjectionPosition.InsideEnd }),
                    code: conditions.map(c => c.toPddlString()).join(' '),
                    documentation: conditionDocumentation,
                    reason: JobSchedulingSyntaxInjector.JOB_SCHEDULING,
                }));
            } else {
                // inject into :condition
                decoration.add(new PddlCodeInjection({
                    offset: this.getOffset(job.condition, positionResolver, { position: InjectionPosition.InsideEnd }),
                    code: and(conditions).toPddlString(),
                    documentation: conditionDocumentation,
                    reason: JobSchedulingSyntaxInjector.JOB_SCHEDULING,
                }));
            }
        } else {
            // inject the :condition to the end of the action
            decoration.add(new PddlCodeInjection({
                offset: this.getOffset(job.duration ?? job.parametersNode, positionResolver, { position: InjectionPosition.OutsideEnd }),
                code: ':condition ' + and(conditions).toPddlString(),
                documentation: conditionDocumentation,
                reason: JobSchedulingSyntaxInjector.JOB_SCHEDULING,
            }));
        }

        const effectDocumentation = {
            title: 'Auto-generated effect',
            codeblock: effects.map(e => e.toPddlString()).join('\n'),
        };

        if (job.effect) {
            const conjunction = job.effect.getFirstOpenBracket('and');
            if (conjunction) {
                // inject into the :effect (and ...) conjunction
                decoration.add(new PddlCodeInjection({
                    offset: this.getOffset(conjunction, positionResolver, { position: InjectionPosition.InsideEnd }),
                    code: effects.map(c => c.toPddlString()).join(' '),
                    documentation: effectDocumentation,
                    reason: JobSchedulingSyntaxInjector.JOB_SCHEDULING,
                }));
            } else {
                // inject into the :effect
                decoration.add(new PddlCodeInjection({
                    offset: this.getOffset(job.effect, positionResolver, { position: InjectionPosition.InsideEnd }),
                    code: and(effects).toPddlString(),
                    documentation: effectDocumentation,
                    reason: JobSchedulingSyntaxInjector.JOB_SCHEDULING,
                }));
            }
        } else {
            // inject the :effect to the end of the action
            decoration.add(new PddlCodeInjection({
                offset: this.getOffset(job.condition ?? job.duration ?? job.parametersNode, positionResolver, { position: InjectionPosition.OutsideEnd }),
                code: ':effect ' + and(effects).toPddlString(),
                documentation: effectDocumentation,
                reason: JobSchedulingSyntaxInjector.JOB_SCHEDULING,
            }));
        }

        return decoration;
    }

    injectMoveAction(domainInfo: DomainInfo, positionResolver: DocumentPositionResolver): void {
        const resParam = new Parameter('res', JobSchedulingSyntaxInjector.RESOURCE);
        const fromParam = new Parameter('from', JobSchedulingSyntaxInjector.LOCATION);
        const toParam = new Parameter('to', JobSchedulingSyntaxInjector.LOCATION);
        const params = `(${resParam.toPddlString()} ${Parameter.createPddlString(fromParam, toParam)})`;
        const durationVar = JobSchedulingSyntaxInjector.TRAVEL_TIME_FUNCTION.bind([resParam, fromParam, toParam]);
        const duration = new EqualityNode(new DurationExpressionNode(), new VariableNode(durationVar)).toPddlString();

        const condition = and([
            atStart(not(JobSchedulingSyntaxInjector.BUSY_PREDICATE.bind([resParam]))),
            atStart(expression(JobSchedulingSyntaxInjector.LOCATED_AT_PREDICATE.bind([resParam, fromParam]))),
        ]).toPddlString();
        const effect = and([
            atStart(not(JobSchedulingSyntaxInjector.LOCATED_AT_PREDICATE.bind([resParam, fromParam]))),
            atStart(expression(JobSchedulingSyntaxInjector.LOCATED_AT_PREDICATE.bind([resParam, toParam]))),
        ]).toPddlString();
        const moveAction = `(:durative-action move :parameters ${params} :duration ${duration} :condition ${condition} :effect ${effect})`;
        domainInfo.getCompilations().add(new CodeInjection({
            offset: this.getOffset(domainInfo.syntaxTree.getDefineNode() as PddlBracketNode, positionResolver, { position: InjectionPosition.InsideEnd }),
            code: moveAction,
            documentation: {
                title: this.createHoverTitle('Resource move action')
            },
            doesNotRequireWhitespaceSurrounding: true,
            reason: JobSchedulingSyntaxInjector.JOB_SCHEDULING,
        }));
    }

    private createHoverTitle(generatedEntitiesName: string): string {
        return generatedEntitiesName + " auto-generated because of the `" + JobSchedulingSyntaxInjector.JOB_SCHEDULING + "` requirement:";
    }
}



class JobDecoration {
    public readonly injections: Compilation[] = [];
    public readonly generatedPredicates: Variable[] = [];
    public readonly generatedFunctions: Variable[] = [];

    add(injection: Compilation): void {
        this.injections.push(injection);
    }

    createDurationVariable(action: Action, resourceTypes: Set<string>): Variable {
        const suffix = JobSchedulingSyntaxInjector.JOB_DURATION_SUFFIX;
        return this.createActionFunction(action, suffix, resourceTypes);
    }

    createActionFunction(action: Action, suffix: string, resourceTypes: Set<string>): Variable {
        const newFunction = this.createActionVariable(action, suffix, resourceTypes);
        this.generatedFunctions.push(newFunction);
        return newFunction;
    }

    createActionPredicate(action: Action, suffix: string, resourceTypes: Set<string>): Variable {
        const newPredicate = this.createActionVariable(action, suffix, resourceTypes);
        this.generatedPredicates.push(newPredicate);
        return newPredicate;
    }

    private createActionVariable(action: Action, suffix: string, resourceTypes: Set<string>): Variable {
        return Variable.from(
            action.name + suffix,
            action.parameters.filter(p => !resourceTypes.has(p.type)));
    }
}
