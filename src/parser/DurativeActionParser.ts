/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { PddlBracketNode, PddlSyntaxNode } from "./PddlSyntaxNode";
import { PddlTokenType } from "./PddlTokenizer";
import { PddlRange, DocumentPositionResolver } from "../DocumentPositionResolver";
import { parseParameters } from "./VariablesParser";
import { DurativeAction, Job } from "../DomainInfo";
import { DerivedVariablesParser } from "./DerivedVariableParser";
import { Parameter } from "../language";

/** 
 * Parses `(:durative-action ...)` blocks.
 */
export class DurativeActionParser<A extends DurativeAction> {
    private action: A;

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
        const location = new PddlRange({
            start: positionResolver.resolveToPosition(actionNode.getStart()),
            end: positionResolver.resolveToPosition(actionNode.getEnd())
        });
        
        this.action = this.createDurativeAction(actionName, parameters, location, actionNode as PddlBracketNode, parametersNode, durationNode, conditionNode, effectNode);
        this.action.setDocumentation(DerivedVariablesParser.getDocumentationAbove(actionNode));
    }

    protected createDurativeAction(actionName: string | undefined, parameters: Parameter[], location: PddlRange,
        actionNode: PddlBracketNode, parametersNode: PddlBracketNode | undefined, 
        durationNode: PddlBracketNode | undefined, conditionNode: PddlBracketNode | undefined, effectNode: PddlBracketNode | undefined): A {
        return new DurativeAction(actionName, parameters, location, actionNode, parametersNode, durationNode, conditionNode, effectNode) as A;
    }

    getAction(): A {
        return this.action;
    }
}

export class JobParser extends DurativeActionParser<Job> {
    protected createDurativeAction(actionName: string | undefined, parameters: Parameter[], location: PddlRange,
        actionNode: PddlBracketNode, parametersNode: PddlBracketNode | undefined, 
        durationNode: PddlBracketNode | undefined, conditionNode: PddlBracketNode | undefined, effectNode: PddlBracketNode | undefined): Job {
        return new Job(actionName, parameters, location, actionNode, parametersNode, durationNode, conditionNode, effectNode);
    }
}