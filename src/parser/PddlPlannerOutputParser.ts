/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi 2020. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */import { Plan } from '../Plan';

import { PlanStep } from '../PlanStep';
import { ProblemInfo } from '../ProblemInfo';
import { DomainInfo } from '../DomainInfo';
import { PddlSyntaxTree } from './PddlSyntaxTree';
import { SimpleDocumentPositionResolver } from '../DocumentPositionResolver';
import { XmlPlanBuilder } from "./XmlPlanBuilder";
import { PddlPlanBuilder } from "./PddlPlanBuilder";

export interface PddlPlanParserOptions {
    epsilon: number;
    minimumPlansExpected?: number;
}

/**
 * Parses plan in the PDDL form incrementally - line/buffer at a time.
 * It can parse a continuous output of a planner, which may contain multiple plans.
 */
export class PddlPlannerOutputParser {
    private readonly plans: Plan[] = [];
    public static readonly planStepPattern = /^\s*((\d+|\d+\.\d+)\s*:)?\s*\((.*)\)\s*(\[\s*(\d+|\d+\.\d+)\s*\])?\s*$/gim;
    private readonly planStatesEvaluatedPattern = /^\s*;?\s*States evaluated[\w ]*:[ ]*(\d*)\s*$/i;
    private readonly planCostPattern = /[\w ]*(cost|metric)[\D]*:\s*([+-]?\d*(\.\d+)?|[+-]?\d(\.\d+)?[Ee][+-]?\d+)\s*$/i;
    private planBuilder: PddlPlanBuilder;
    private endOfBufferToBeParsedNextTime = '';
    private xmlPlanBuilder: XmlPlanBuilder | undefined;
    private planTimeScale = 1;
    
    constructor(private domain: DomainInfo, private problem: ProblemInfo, public readonly options: PddlPlanParserOptions, private onPlanReady?: (plans: Plan[]) => void) {
        this.planBuilder = new PddlPlanBuilder(options.epsilon);
    }
    setPlanMetaData(makespan: number, metric: number, statesEvaluated: number, _elapsedTimeInSeconds: number, planTimeScale: number): void {
        this.planBuilder.setMakespan(makespan);
        this.planBuilder.setMetric(metric);
        this.planBuilder.setStatesEvaluated(statesEvaluated);
        this.planTimeScale = planTimeScale;
    }
    /**
     * Appends and parses the planner output.
     * @param text planner output
     */
    appendBuffer(text: string): void {
        const textString = this.endOfBufferToBeParsedNextTime + text;
        this.endOfBufferToBeParsedNextTime = '';
        let lastEndLine = 0;
        let nextEndLine: number;
        while ((nextEndLine = textString.indexOf('\n', lastEndLine)) > -1) {
            const nextLine = textString.substring(lastEndLine, nextEndLine + 1);
            if (nextLine.trim()) {
                this.appendLine(nextLine);
            }
            lastEndLine = nextEndLine + 1;
        }
        if (textString.length > lastEndLine) {
            this.endOfBufferToBeParsedNextTime = textString.substr(lastEndLine);
        }
    }
    /**
     * Parses one line of parser output.
     * @param outputLine one line of planner output
     */
    appendLine(outputLine: string): void {
        if (this.xmlPlanBuilder || XmlPlanBuilder.isXmlStart(outputLine)) {
            (this.xmlPlanBuilder || (this.xmlPlanBuilder = new XmlPlanBuilder(this.planTimeScale))).appendLine(outputLine);
            if (this.xmlPlanBuilder.isComplete()) {
                // extract plan
                this.xmlPlanBuilder.getPlanSteps()
                    .then(steps => {
                        steps.forEach(step => this.appendStep(step));
                        this.xmlPlanBuilder = undefined;
                        this.onPlanFinished();
                    })
                    .catch(reason => {
                        console.log(reason);
                    });
            }
            return;
        }
        const planStep = this.planBuilder.parse(outputLine, undefined);
        if (planStep) {
            // this line is a plan step
            this.appendStep(planStep);
        }
        else {
            // this line is NOT a plan step
            if (this.planBuilder.parsingPlan) {
                this.planBuilder.parsingPlan = false;
                this.onPlanFinished();
            }
            let group: RegExpExecArray | null;
            this.planStatesEvaluatedPattern.lastIndex = 0;
            this.planCostPattern.lastIndex = 0;
            if (group = this.planStatesEvaluatedPattern.exec(outputLine)) {
                this.planBuilder.setStatesEvaluated(parseInt(group[1]));
            }
            else if (group = this.planCostPattern.exec(outputLine)) {
                this.planBuilder.setMetric(parseFloat(group[2]));
            }
        }
        this.planBuilder.outputText += outputLine;
    }
    /**
     * Appends plan step. Use this when the plan does not need parsing.
     * @param planStep plan step to add to the plan
     */
    appendStep(planStep: PlanStep): void {
        this.planBuilder.add(planStep);
        if (!this.planBuilder.parsingPlan) {
            this.planBuilder.parsingPlan = true;
        }
    }
    /**
     * Call this when the planning engine stopped. This flushes the last line in the buffered output through the parsing
     * and adds the last plan to the collection of plans.
     */
    onPlanFinished(): void {
        if (this.endOfBufferToBeParsedNextTime.length) {
            this.appendLine(this.endOfBufferToBeParsedNextTime);
            this.endOfBufferToBeParsedNextTime = '';
        }
        if (this.planBuilder.getSteps().length > 0 ||
            this.plans.length < (this.options.minimumPlansExpected ?? 1)) {
            this.plans.push(this.planBuilder.build(this.domain, this.problem));
            this.planBuilder = new PddlPlanBuilder(this.options.epsilon);
        }
        if (this.onPlanReady) {
            this.onPlanReady.apply(this, [this.plans]);
        }
    }
    /** Gets current plan's provisional makespan. */
    getCurrentPlanMakespan(): number {
        return this.planBuilder.getMakespan();
    }
    /**
     * Gets all plans.
     */
    getPlans(): Plan[] {
        return this.plans;
    }
    static parseOnePlan(planText: string, planPath: string, epsilon: number): Plan {
        const dummyDomain = new DomainInfo(planPath, 1, 'domain', PddlSyntaxTree.EMPTY, new SimpleDocumentPositionResolver(''));
        const dummyProblem = new ProblemInfo(planPath, 1, 'problem', 'domain', PddlSyntaxTree.EMPTY, new SimpleDocumentPositionResolver(''));
        const parser = new PddlPlannerOutputParser(dummyDomain, dummyProblem, { minimumPlansExpected: 1, epsilon: epsilon });
        parser.appendBuffer(planText);
        parser.onPlanFinished();
        const plans = parser.getPlans();
        if (plans.length === 1) {
            return plans[0];
        }
        else {
            throw new Error(`Unexpected number of expected plans (${plans.length}) in file ${planPath}.`);
        }
    }
}
