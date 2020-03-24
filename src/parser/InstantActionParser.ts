/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { PddlSyntaxNode } from "./PddlSyntaxNode";
import { PddlTokenType } from "./PddlTokenizer";
import { PddlRange, DocumentPositionResolver } from "../DocumentPositionResolver";
import { parseParameters } from "./VariablesParser";
import { InstantAction } from "../DomainInfo";
import { DerivedVariablesParser } from "./DerivedVariableParser";

/** 
 * Parses `(:action ...)` blocks.
 */
export class InstantActionParser {
    private action: InstantAction;

    constructor(actionNode: PddlSyntaxNode, positionResolver: DocumentPositionResolver) {

        /*(:action|process|event name
            :parameters (<parameters>)
            :precondition (and <conditions>)
            :effect (and <effects>)
        )*/

        const nameNode = actionNode.getFirstChild(PddlTokenType.Other, /[\w-]+/);

        const actionName = nameNode ? nameNode.getText() : undefined;

        const parametersNode = actionNode.getKeywordOpenBracket('parameters');
        const parameters = parametersNode ? parseParameters(parametersNode.getNestedNonCommentText()) : [];
        const conditionNode = actionNode.getKeywordOpenBracket('precondition');
        const effectNode = actionNode.getKeywordOpenBracket('effect');
        const location = PddlRange.from(positionResolver
            .resolveToPosition(actionNode.getStart()), positionResolver.resolveToPosition(actionNode.getEnd()));
        this.action = new InstantAction(actionName, parameters, location, conditionNode, effectNode);
        this.action.setDocumentation(DerivedVariablesParser.getDocumentationAbove(actionNode));
    }

    getAction(): InstantAction {
        return this.action;
    }
}