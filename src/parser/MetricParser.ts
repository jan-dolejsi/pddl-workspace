/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { PddlSyntaxNode } from "./PddlSyntaxNode";
import { isOpenBracket } from "./PddlTokenizer";
import { PddlRange, DocumentPositionResolver } from "../DocumentPositionResolver";
import { DerivedVariablesParser } from "./DerivedVariableParser";
import { MetricDirection, Metric } from "../ProblemInfo";
import { NumericExpression } from "../NumericExpression";
import { NumericExpressionParser } from "./NumericExpressionParser";

/** 
 * Parses `(:metric ...)` blocks.
 */
export class MetricParser {
    private metric: Metric | undefined;

    constructor(metricNode: PddlSyntaxNode, positionResolver: DocumentPositionResolver) {

        /*(:metric
            minimize|maximize
            <expression>
        )*/

        let direction: MetricDirection | undefined;
        let expression: NumericExpression | undefined;

        const children = metricNode.getNonWhitespaceNonCommentChildren()

        children.forEach(node => {
            const match = node.getText().match(/(minimize|maximize)/i);
            if (match?.length) {
                switch (match[1]) {
                    case "minimize":
                        direction = MetricDirection.MINIMIZE;
                        break;
                    case "maximize":
                        direction = MetricDirection.MAXIMIZE;
                        break;
                }
            } else if (isOpenBracket(node.getToken())) {
                expression = new NumericExpressionParser(node).getExpression();
            }
        });

        if (direction !== undefined && expression !== undefined) {
            const location = PddlRange.from(positionResolver
                .resolveToPosition(metricNode.getStart()), positionResolver.resolveToPosition(metricNode.getEnd()));
            const documentation = DerivedVariablesParser.getDocumentationAbove(metricNode);
            this.metric = new Metric(direction, expression, location, documentation);
        }
    }

    getMetric(): Metric | undefined{
        return this.metric;
    }
}