/* --------------------------------------------------------------------------------------------
* Copyright (c) Jan Dolejsi. All rights reserved.
* Licensed under the MIT License. See License.txt in the project root for license information.
* ------------------------------------------------------------------------------------------ */

import { PddlExtensionContext } from "../PddlExtensionContext";
import { PlanBuilder } from "./PddlPlanParser";
import { HappeningsInfo, PlanHappeningsBuilder } from "../HappeningsInfo";
import { FileInfo, PddlLanguage } from "../FileInfo";
import { PddlSyntaxTree } from "./PddlSyntaxTree";
import { DocumentPositionResolver } from "../DocumentPositionResolver";
import { DomainInfo } from "../DomainInfo";
import { PddlDomainParser } from "./PddlDomainParser";
import { PddlProblemParser } from "./PddlProblemParser";
import { ProblemInfo } from "../ProblemInfo";
import { PlanInfo } from "../PlanInfo";

export const UNSPECIFIED_PROBLEM = 'unspecified';
export const UNSPECIFIED_DOMAIN = 'unspecified';

export class Parser {

    private problemParser: PddlProblemParser;

    constructor(context?: PddlExtensionContext) {
        if (context) {
            this.problemParser = new PddlProblemParser(context);
        } else {
            this.problemParser = new PddlProblemParser();
        }
    }

    async tryProblem(fileUri: string, fileVersion: number, fileText: string, syntaxTree: PddlSyntaxTree, positionResolver: DocumentPositionResolver): Promise<ProblemInfo | undefined> {
        return this.problemParser.parse(fileUri, fileVersion, fileText, syntaxTree, positionResolver);
    }

    tryDomain(fileUri: string, fileVersion: number, fileText: string, syntaxTree: PddlSyntaxTree, positionResolver: DocumentPositionResolver): DomainInfo | undefined {

        //(define (domain domain_name)

        const defineNode = syntaxTree.getDefineNode();
        if (!defineNode) { return undefined; }

        const domainNode = defineNode.getFirstOpenBracket('domain');
        if (!domainNode) { return undefined; }

        return new PddlDomainParser(fileUri, fileVersion, fileText, domainNode, syntaxTree, positionResolver).getDomain();
    }

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

    parsePlan(fileUri: string, fileVersion: number, fileText: string, epsilon: number, positionResolver: DocumentPositionResolver): PlanInfo {
        const meta = Parser.parsePlanMeta(fileText);

        const planInfo = new PlanInfo(fileUri, fileVersion, meta.problemName, meta.domainName, fileText, positionResolver);
        const planBuilder = new PlanBuilder(epsilon);
        fileText.split('\n').forEach((planLine: string, index: number) => {
            const planStep = planBuilder.parse(planLine, index);
            if (planStep) {
                planBuilder.add(planStep);
            }
        });
        planInfo.setSteps(planBuilder.getSteps());

        return planInfo;
    }

    parseHappenings(fileUri: string, fileVersion: number, fileText: string, epsilon: number, positionResolver: DocumentPositionResolver): HappeningsInfo {
        const meta = Parser.parsePlanMeta(fileText);

        const happeningsInfo = new HappeningsInfo(fileUri, fileVersion, meta.problemName, meta.domainName, fileText, positionResolver);
        const planBuilder = new PlanHappeningsBuilder(epsilon);
        planBuilder.tryParseFile(fileText);
        happeningsInfo.setHappenings(planBuilder.getHappenings());
        happeningsInfo.addProblems(planBuilder.getParsingProblems());
        planBuilder.validateOpenQueueIsEmpty();

        return happeningsInfo;
    }
}

export class UnknownFileInfo extends FileInfo {
    constructor(fileUri: string, version: number, positionResolver: DocumentPositionResolver) {
        super(fileUri, version, "", PddlSyntaxTree.EMPTY, positionResolver);
    }

    getLanguage(): PddlLanguage {
        return PddlLanguage.PDDL;
    }

    isUnknownPddl(): boolean {
        return true;
    }
}

// Language ID of Domain and Problem files
export const PDDL = 'pddl';
// Language ID of Plan files
export const PLAN = 'plan';
// Language ID of Happenings files
export const HAPPENINGS = 'happenings';

const languageMap = new Map<string, PddlLanguage>([
    [PDDL, PddlLanguage.PDDL],
    [PLAN, PddlLanguage.PLAN],
    [HAPPENINGS, PddlLanguage.HAPPENINGS]
]);

export function toLanguageFromId(languageId: string): PddlLanguage | undefined {
    return languageMap.get(languageId);
}

export interface PlanMetaData {
    readonly domainName: string;
    readonly problemName: string;
}
