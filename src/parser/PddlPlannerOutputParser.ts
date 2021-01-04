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
import { URI } from 'vscode-uri';
import { PddlPlanParser } from './PddlPlanParser';

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
    private pddlPlanParser: PddlPlanParser;
    private planBuilder: PddlPlanBuilder;
    private endOfBufferToBeParsedNextTime = '';
    private xmlPlanBuilder: XmlPlanBuilder | undefined;
    private planTimeScale = 1;

    constructor(private domain: DomainInfo, private problem: ProblemInfo, public readonly options: PddlPlanParserOptions, private onPlanReady?: (plans: Plan[]) => void) {
        this.planBuilder = new PddlPlanBuilder(options.epsilon);
        this.pddlPlanParser = new PddlPlanParser();
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
                this.appendLine(nextLine.trim());
            }
            lastEndLine = nextEndLine + 1;
        }
        if (textString.length > lastEndLine) {
            this.endOfBufferToBeParsedNextTime = textString.substr(lastEndLine);
        }
    }

    async appendXplan(planXml: string): Promise<Plan[]> {
        if (this.xmlPlanBuilder) {
            throw new Error("Mix of incremental XML parsing and full plan appending is not supported.");
        }
        const xmlPlanBuilder = new XmlPlanBuilder(this.planTimeScale);
        xmlPlanBuilder.appendLine(planXml);
        const steps = await xmlPlanBuilder.getPlanSteps();
        steps.forEach(step => this.appendStep(step));
        this.onPlanFinished();
        return this.getPlans();
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
        const planStep = this.pddlPlanParser.parse(outputLine, undefined, this.planBuilder);
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
            this.pddlPlanParser.parsePlanQuality(outputLine, this.planBuilder);
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
        if (this.endOfBufferToBeParsedNextTime.trim().length) {
            this.appendLine(this.endOfBufferToBeParsedNextTime.trim());
            this.endOfBufferToBeParsedNextTime = '';
        }
        if (this.planBuilder.getSteps().length > 0 ||
            this.plans.length < (this.options.minimumPlansExpected ?? 1)) {
            this.plans.push(this.planBuilder.build(this.domain, this.problem));
            this.planBuilder = new PddlPlanBuilder(this.options.epsilon);
        } else {
            // patch the previous plan metric and makespan if printed after the plan
            if (this.plans.length > 0) {
                const lastPlan = this.plans[this.plans.length - 1];
                if (this.planBuilder.getMetric() !== undefined 
                    && !lastPlan.isMetricDefined()) {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    lastPlan.metric = this.planBuilder.getMetric()!;
                }
            }
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
    static parseOnePlan(planText: string, planUri: URI, epsilon: number): Plan {
        const dummyDomain = new DomainInfo(planUri, 1, 'domain', PddlSyntaxTree.EMPTY, new SimpleDocumentPositionResolver(''));
        const dummyProblem = new ProblemInfo(planUri, 1, 'problem', 'domain', PddlSyntaxTree.EMPTY, new SimpleDocumentPositionResolver(''));
        const parser = new PddlPlannerOutputParser(dummyDomain, dummyProblem, { minimumPlansExpected: 1, epsilon: epsilon });
        parser.appendBuffer(planText);
        parser.onPlanFinished();
        const plans = parser.getPlans();
        if (plans.length === 1) {
            return plans[0];
        }
        else {
            throw new Error(`Unexpected number of expected plans (${plans.length}) in file ${planUri.toString()}.`);
        }
    }
}
