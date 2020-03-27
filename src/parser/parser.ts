/* --------------------------------------------------------------------------------------------
* Copyright (c) Jan Dolejsi. All rights reserved.
* Licensed under the MIT License. See License.txt in the project root for license information.
* ------------------------------------------------------------------------------------------ */

import { PddlExtensionContext } from "../PddlExtensionContext";
import { HappeningsInfo, PlanHappeningsBuilder } from "../HappeningsInfo";
import { PddlSyntaxTree } from "./PddlSyntaxTree";
import { DocumentPositionResolver } from "../DocumentPositionResolver";
import { DomainInfo } from "../DomainInfo";
import { PddlDomainParser } from "./PddlDomainParser";
import { PddlProblemParser } from "./PddlProblemParser";
import { ProblemInfo } from "../ProblemInfo";
import { PddlPlanParser } from "./PddlPlanParser";

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

    parseHappenings(fileUri: string, fileVersion: number, fileText: string, epsilon: number, positionResolver: DocumentPositionResolver): HappeningsInfo {
        const meta = PddlPlanParser.parsePlanMeta(fileText);

        const happeningsInfo = new HappeningsInfo(fileUri, fileVersion, meta.problemName, meta.domainName, fileText, positionResolver);
        const planBuilder = new PlanHappeningsBuilder(epsilon);
        planBuilder.tryParseFile(fileText);
        happeningsInfo.setHappenings(planBuilder.getHappenings());
        happeningsInfo.addProblems(planBuilder.getParsingProblems());
        planBuilder.validateOpenQueueIsEmpty();

        return happeningsInfo;
    }
}


