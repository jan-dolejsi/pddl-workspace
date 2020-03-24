/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { PddlSyntaxNode } from "./PddlSyntaxNode";
import { PddlTokenType } from "./PddlTokenizer";
import { PddlRange, DocumentPositionResolver } from "../DocumentPositionResolver";
import { parseParameters } from "./VariablesParser";
import { DurativeAction } from "../DomainInfo";
import { DerivedVariablesParser } from "./DerivedVariableParser";

/** 
 * Parses `(:durative-action ...)` blocks.
 */
export class DurativeActionParser {
    private action: DurativeAction;

    constructor(actionNode: PddlSyntaxNode, positionResolver: DocumentPositionResolver) {

        /*(:durative-action name
            :parameters (<parameters>)
            :duration (<duration constraint>)
            :condition (and
                (at start (<condition>))
                (over all (<condition>))
                (at end (<condition>))
            )
            :effect (and
                (at start (<effect>))
                (at end (<effect>))
                (increase (<function>) (* #t <expression>))
                (decrease (<function>) (* #t <expression>))
            )
        )*/

        const nameNode = actionNode.getFirstChild(PddlTokenType.Other, /[\w-]+/);

        const actionName = nameNode ? nameNode.getText() : undefined;

        const parametersNode = actionNode.getKeywordOpenBracket('parameters');
        const parameters = parametersNode ? parseParameters(parametersNode.getNestedNonCommentText()) : [];
        
        const durationNode = actionNode.getKeywordOpenBracket('duration');
        const conditionNode = actionNode.getKeywordOpenBracket('condition');
        const effectNode = actionNode.getKeywordOpenBracket('effect');
        const location = PddlRange.from(positionResolver
            .resolveToPosition(actionNode.getStart()), positionResolver.resolveToPosition(actionNode.getEnd()));
        
        this.action = new DurativeAction(actionName, parameters, location, durationNode, conditionNode, effectNode);
        this.action.setDocumentation(DerivedVariablesParser.getDocumentationAbove(actionNode));
    }

    getAction(): DurativeAction {
        return this.action;
    }
}