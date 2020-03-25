/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { PlanInfo } from '../PlanInfo';
import { PddlPlanBuilder } from './PddlPlanBuilder';
import { DocumentPositionResolver, SimpleDocumentPositionResolver } from '../DocumentPositionResolver';

export const UNSPECIFIED_PROBLEM = 'unspecified';
export const UNSPECIFIED_DOMAIN = 'unspecified';


export interface PlanMetaData {
    readonly domainName: string;
    readonly problemName: string;
}

export class PddlPlanParser {

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
    
    static parseText(planText: string, epsilon = 0.001, fileUri = 'string://noname', fileVersion = -1, positionResolver?: DocumentPositionResolver): PlanInfo {
        const meta = PddlPlanParser.parsePlanMeta(planText);

        const definedPositionResolver = positionResolver ?? new SimpleDocumentPositionResolver(planText);

        const planInfo = new PlanInfo(fileUri, fileVersion, meta.problemName, meta.domainName, planText, definedPositionResolver);
        const planBuilder = new PddlPlanBuilder(epsilon);
        planText.split('\n').forEach((planLine: string, index: number) => {
            const planStep = planBuilder.parse(planLine, index);
            if (planStep) {
                planBuilder.add(planStep);
            }
        });
        planInfo.setSteps(planBuilder.getSteps());

        return planInfo;
    }
}
