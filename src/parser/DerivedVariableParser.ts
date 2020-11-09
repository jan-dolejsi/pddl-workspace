/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { PddlSyntaxNode } from "./PddlSyntaxNode";
import { Variable } from "../language";
import { PddlTokenType } from "./PddlTokenizer";
import { PddlRange, DocumentPositionResolver } from "../DocumentPositionResolver";
import { parseParameters } from "./VariablesParser";

/** Parses derived predicates and functions. E.g.:
 * `(:derived (<p> ?x ?y - type) <condition> )`
 */
export class DerivedVariablesParser {
    private conditionNode: PddlSyntaxNode | undefined;
    private variable: Variable | undefined;

    constructor(derivedNode: PddlSyntaxNode, positionResolver: DocumentPositionResolver) {
        const children = derivedNode.getNonWhitespaceChildren()
            .filter(c => c.getToken().type !== PddlTokenType.Comment);
        if (children.length !== 2) {
            return;
        }

        const fullNameNode = children[0];
        if (fullNameNode.getToken().type !== PddlTokenType.OpenBracket) {
            return;
        }

        const fullName = fullNameNode.getNestedText();
        const parameters = parseParameters(fullName);

        this.conditionNode = children[1];
        this.variable = new Variable(fullName, parameters);
        const location = new PddlRange({
            start: positionResolver.resolveToPosition(derivedNode.getStart()),
            end: positionResolver.resolveToPosition(derivedNode.getEnd())
        });
        this.variable.setLocation(location);
        this.variable.setDocumentation(DerivedVariablesParser.getDocumentationAbove(derivedNode));
    }

    static getDocumentationAbove(derivedNode: PddlSyntaxNode): string[] {
        const siblingNodes = derivedNode.getParent()?.getChildren() ?? [];

        const indexOfThisNode = siblingNodes.indexOf(derivedNode);

        // iterate backwards through the siblings and find first comment line
        // the previous sibling should be a white space
        const whiteSpaceIndex = indexOfThisNode - 1;
        if (whiteSpaceIndex < 0 || siblingNodes[whiteSpaceIndex].getToken().type !== PddlTokenType.Whitespace) {
            return [];
        }

        const commentIndex = whiteSpaceIndex - 1;
        if (commentIndex < 0 || siblingNodes[commentIndex].getToken().type !== PddlTokenType.Comment) {
            return [];
        }
        else {
            const documentation = siblingNodes[commentIndex].getText().substr(1).trim(); // strip the semicolon
            return [documentation];
        }
    }

    getVariable(): Variable | undefined {
        return this.variable;
    }

    getConditionNode(): PddlSyntaxNode | undefined {
        return this.conditionNode;
    }
}