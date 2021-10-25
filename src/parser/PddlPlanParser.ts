/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { PlanInfo } from '../PlanInfo';
import { PddlPlanBuilder } from './PddlPlanBuilder';
import { DocumentPositionResolver, SimpleDocumentPositionResolver } from '../DocumentPositionResolver';
import { URI } from 'vscode-uri';
import { PlanStep } from '../PlanStep';

export const UNSPECIFIED_PROBLEM = 'unspecified';
export const UNSPECIFIED_DOMAIN = 'unspecified';


export interface PlanMetaData {
    readonly domainName: string;
    readonly problemName: string;
}

export class PddlPlanParser {

    private readonly planStepPattern = /^\s*((\d+|\d+\.\d+)\s*:)?\s*\((.*)\)\s*(\[(?:D:)?\s*(\d+|\d+\.\d+)\s*(?:;\s*C:[\d.]+)?\])?\s*$/gim;
    private readonly planStatesEvaluatedPattern = /^\s*;?\s*States evaluated[\w ]*:[ ]*(\d*)\s*$/i;
    private readonly planMetricPattern = /[\w ]*(cost|metric)[^-\w]*:?\s*([+-]?\d*(\.\d+)?|[+-]?\d(\.\d+)?[Ee][+-]?\d+)\s*$/i;

    static parsePlanMeta(fileText: string): PlanMetaData {
        let problemName = UNSPECIFIED_PROBLEM;
        const problemMatch = fileText.match(/^;;\s*!problem:\s*([\w-]+)\s*$/m);
        if (problemMatch) {
            problemName = problemMatch[1];
        }

        let domainName = UNSPECIFIED_DOMAIN;
        const domainMatch = fileText.match(/^;;\s*!domain:\s*([\w-]+)\s*$/m);
        if (domainMatch) {
            domainName = domainMatch[1];
        }

        return { domainName: domainName, problemName: problemName };
    }
    
    static getPlanMeta(domainName: string, problemName: string, endl: string): string {
        return `;;!domain: ${domainName}${endl};;!problem: ${problemName}${endl}`;
    }

    parseText(planText: string, epsilon = 0.001, fileUri = URI.parse('string://noname'), fileVersion = -1, positionResolver?: DocumentPositionResolver): PlanInfo {
        const meta = PddlPlanParser.parsePlanMeta(planText);

        const definedPositionResolver = positionResolver ?? new SimpleDocumentPositionResolver(planText);

        const planInfo = new PlanInfo(fileUri, fileVersion, meta.problemName, meta.domainName, planText, definedPositionResolver);
        const planBuilder = new PddlPlanBuilder(epsilon);
        planText.split('\n').forEach((planLine: string, index: number) =>
            this.tryParseLine(planLine, index, planBuilder));
        planInfo.setSteps(planBuilder.getSteps());

        planInfo.metric = planBuilder.getMetric();
        planInfo.statesEvaluated = planBuilder.getStatesEvaluated();

        return planInfo;
    }

    private tryParseLine(planLine: string, index: number, planBuilder: PddlPlanBuilder): void {
        const planStep = this.parse(planLine, index, planBuilder);
        if (planStep) {
            planBuilder.add(planStep);
        } else {
            this.parsePlanQuality(planLine, planBuilder);
        }
    }
    
    /**
     * Parses one line from the plan
     * @param planLine line of text from the plan file
     * @param lineIndex index of the line being parsed
     */
    parse(planLine: string, lineIndex: number | undefined, planBuilder: PddlPlanBuilder): PlanStep | undefined {
        this.planStepPattern.lastIndex = 0;
        const group = this.planStepPattern.exec(planLine);
        if (group) {
            // this line is a valid plan step
            const time = group[2] ? parseFloat(group[2]) : planBuilder.getMakespan();
            const action = group[3].trim();
            const isDurative = group[5] ? true : false;
            const duration = isDurative ? parseFloat(group[5]) : planBuilder.epsilon;
            return new PlanStep(time, action, isDurative, duration, lineIndex);
        }
        else {
            return undefined;
        }
    }

    parsePlanQuality(planLine: string, planBuilder: PddlPlanBuilder): void {
        let group: RegExpExecArray | null;
        this.planStatesEvaluatedPattern.lastIndex = 0;
        this.planMetricPattern.lastIndex = 0;
        if (group = this.planStatesEvaluatedPattern.exec(planLine)) {
            planBuilder.setStatesEvaluated(parseInt(group[1]));
        }
        else if (!planLine.match(/action/i) &&
            (group = this.planMetricPattern.exec(planLine))) {
            if (group[2]?.length > 0) {
                planBuilder.setMetric(parseFloat(group[2]));
            }
        }
    }
}
