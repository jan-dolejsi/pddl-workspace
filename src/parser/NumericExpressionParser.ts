/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { PddlSyntaxNode } from "./PddlSyntaxNode";
// import { PddlTokenType } from "./PddlTokenizer";
// import { PddlRange, DocumentPositionResolver } from "../DocumentPositionResolver";
import { NumericExpression, Sum, Product, NumericLiteral, Subtraction, Division } from "../NumericExpression";
import { VariableExpression } from "..";

/** 
 * Parses `(+ (a) (b))` numeric expressions.
 */
export class NumericExpressionParser {

    private expression: NumericExpression | undefined;

    constructor(rootNode: PddlSyntaxNode) {
        this.expression = this.parseNode(rootNode);
    }

    getExpression(): NumericExpression | undefined {
        return this.expression;
    }

    private parseNode(node: PddlSyntaxNode): NumericExpression | undefined {
        switch (node.getToken().tokenText) {
            case '(+':
                const summants = this.parseChildren(node);
                return new Sum(summants);
            case '(*':
                const multiplicants = this.parseChildren(node);
                return new Product(multiplicants);
            case '(/': {
                const operands = this.parseChildren(node);
                if (operands.length === 2) {
                    return new Division(operands[0], operands[1]);
                } else {
                    return undefined;
                }
            }
            case '(-': {
                const operands = this.parseChildren(node);
                if (operands.length === 2) {
                    return new Subtraction(operands[0], operands[1]);
                } else {
                    return undefined;
                }
            }
        }

        if (node.getToken().tokenText.startsWith('(')) {
            return new VariableExpression(node.getNestedText());
        }
        else if (parseFloat(node.getToken().tokenText)) {
            // the parsed value may be NaN
            return new NumericLiteral(parseFloat(node.getToken().tokenText));
        }
    }

    private parseChildren(node: PddlSyntaxNode): NumericExpression[] {
        return node.getNonWhitespaceNonCommentChildren()
            .map(childNode => this.parseNode(childNode))
            // todo: should not be filtering out elements that failed to parse, but rather reporting the failure
            .filter(c => !!c)
            .map(c => c!);
    }
}