/* --------------------------------------------------------------------------------------------
* Copyright (c) Jan Dolejsi. All rights reserved.
* Licensed under the MIT License. See License.txt in the project root for license information.
* ------------------------------------------------------------------------------------------ */

import { HappeningsInfo } from "../HappeningsInfo";
import { PlanHappeningsBuilder } from "./PlanHappeningsBuilder";
import { DocumentPositionResolver } from "../DocumentPositionResolver";
import { PddlPlanParser } from "./PddlPlanParser";
import { URI } from "vscode-uri";

export class HappeningsParser {

    parseHappenings(fileUri: URI, fileVersion: number, fileText: string, epsilon: number, positionResolver: DocumentPositionResolver): HappeningsInfo {
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


