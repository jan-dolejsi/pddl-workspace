/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi 2020. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { PlanStep } from '../PlanStep';

export class XmlPlanBuilder {
    private xmlText = '';
    constructor(private readonly planTimeScale: number) { }
    static isXmlStart(outputLine: string): boolean {
        return outputLine.match(/<\?xml /) !== null;
    }
    appendLine(outputLine: string): void {
        this.xmlText += outputLine;
    }
    isComplete(): boolean {
        return this.xmlText.match(/<\/Plan>\s*$/) !== null;
    }
    async getPlanSteps(): Promise<PlanStep[]> {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const xml2js = require('xml2js');
        const parser = new xml2js.Parser();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let plan: any;
        try {
            plan = await parser.parseStringPromise(this.xmlText) as never;
        }
        catch (err) {
            console.log(err);
            throw err;
        }
        const steps: PlanStep[] = [];
        for (const happening of plan.Plan.Actions[0].OrderedHappening) {
            //const happeningId = happening.HappeningID[0];
            if (happening.Happening[0].ActionStart) {
                const actionStart = happening.Happening[0].ActionStart[0];
                const startTime = this.parseTimeStamp(actionStart.ExpectedStartTime[0]);
                const actionName = actionStart.Name[0];
                const actionParameters = actionStart.Parameters
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ? ' ' + actionStart.Parameters[0].Parameter.map((p: any) => p.Symbol[0]).join(' ')
                    : '';
                const isDurative = actionStart.ExpectedDuration !== undefined;
                const duration = isDurative ? this.parseTimeStamp(actionStart.ExpectedDuration[0]) : undefined;
                steps.push(new PlanStep(startTime, actionName + actionParameters, isDurative, duration, -1));
            }
        }
        return steps;
    }
    private parseTimeStamp(timestamp: string): number {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pxd = require('parse-xsd-duration');
        return pxd.default(timestamp) / this.planTimeScale;
    }
}
