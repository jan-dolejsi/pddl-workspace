/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi 2020. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { PlanStep } from "./PlanStep";
import { Happening } from "./HappeningsInfo";
import { FileInfo } from "./FileInfo";
import { PddlSyntaxTree } from "./parser/PddlSyntaxTree";
import { DocumentPositionResolver } from "./DocumentPositionResolver";
import { PddlLanguage } from "./language";
import { URI } from "vscode-uri";
import { ProblemInfo } from "./ProblemInfo";
import { Plan } from "./Plan";
import { DomainInfo } from "./DomainInfo";
/**
 * Plan file.
 */
export class PlanInfo extends FileInfo {
    steps: PlanStep[] = [];
    constructor(fileUri: URI, version: number, public problemName: string, public domainName: string, text: string, positionResolver: DocumentPositionResolver) {
        // note we use the `problemName` as the plan name as the plan does not have any declared name
        super(fileUri, version, problemName, PddlSyntaxTree.EMPTY, positionResolver);
        this.setText(text);
    }
    getLanguage(): PddlLanguage {
        return PddlLanguage.PLAN;
    }
    setSteps(steps: PlanStep[]): void {
        this.steps = steps;
    }
    getSteps(): PlanStep[] {
        return this.steps;
    }
    isPlan(): boolean {
        return true;
    }
    static getHappenings(planSteps: PlanStep[]): Happening[] {
        // todo: when flatMap is available, rewrite this...
        const happenings: Happening[] = [];
        planSteps
            .forEach((planStep, idx, allSteps) => happenings.push(...planStep.getHappenings(allSteps.slice(0, idx - 1))));
        const compare = function (happening1: Happening, happening2: Happening): number {
            if (happening1.getTime() !== happening2.getTime()) {
                return happening1.getTime() - happening2.getTime();
            }
            else {
                return happening1.getFullActionName().localeCompare(happening2.getFullActionName());
            }
        };
        return happenings.sort(compare);
    }
    getHappenings(): Happening[] {
        return PlanInfo.getHappenings(this.getSteps());
    }
    getPlan(domain: DomainInfo, problem: ProblemInfo): Plan {
        return new Plan(this.getSteps(), domain, problem);
    }
}
