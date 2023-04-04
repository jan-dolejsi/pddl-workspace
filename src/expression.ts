/*
 * Copyright (c) Jan Dolejsi 2023. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 */
'use strict';

import { Variable } from "./language";


export abstract class ExpressionNode {
    abstract toPddlString(): string;
}

export class VariableDeclarationNode extends ExpressionNode {
    constructor(public readonly variable: Variable) {
        super();
    }

    toPddlString(): string {
        return '(' + this.variable.getFullName() + ')';
    }
}

export class VariableNode extends ExpressionNode {
    constructor(public readonly variable: Variable) {
        super();
    }

    toPddlString(): string {
        return '(' + this.variable.declaredNameWithoutTypes + ')';
    }
}

export class UnaryExpressionNode extends ExpressionNode {
    constructor(public readonly nested: ExpressionNode, private readonly keyword: string) {
        super();
    }
    toPddlString(): string {
        return '(' + this.keyword + ' ' + this.nested.toPddlString() + ')';
    }
}

export class BinaryExpressionNode extends ExpressionNode {
    constructor(public readonly left: ExpressionNode, public readonly right: ExpressionNode, private readonly keyword: string) {
        super();
    }
    toPddlString(): string {
        return '(' + this.keyword + ' ' + this.left.toPddlString() + ' ' + this.right.toPddlString() + ')';
    }
}

export class NAryLogicalExpression extends ExpressionNode {
    constructor(public readonly operands: ExpressionNode[], private readonly keyword: string) {
        super();
    }
    toPddlString(): string {
        return '(' + this.keyword + ' ' + this.operands.map(o => o.toPddlString()).join(' ') + ')';
    }
}

export class Not extends UnaryExpressionNode {
    constructor(public readonly nested: ExpressionNode) {
        super(nested, 'not');
    }
}

export class AtStart extends UnaryExpressionNode {
    constructor(public readonly nested: ExpressionNode) {
        super(nested, 'at start');
    }
}

export class AtEnd extends UnaryExpressionNode {
    constructor(public readonly nested: ExpressionNode) {
        super(nested, 'at end');
    }
}

export class OverAll extends UnaryExpressionNode {
    constructor(public readonly nested: ExpressionNode) {
        super(nested, 'over all');
    }
}

export class DurationExpressionNode extends ExpressionNode {
    constructor() {
        super();
    }
    toPddlString(): string {
        return '?duration';
    }
}

export class EqualityNode extends BinaryExpressionNode {
    constructor(public readonly left: ExpressionNode, public readonly right: ExpressionNode) {
        super(left, right, '=');
    }
}

export function expression(variable: Variable): ExpressionNode {
    return new VariableNode(variable);
}

export function overAll(expression: ExpressionNode): ExpressionNode {
    return new OverAll(expression);
}

export function atEnd(expression: ExpressionNode): ExpressionNode {
    return new AtEnd(expression);
}

export function atStart(expression: ExpressionNode): ExpressionNode {
    return new AtStart(expression);
}

export function not(variable: Variable): ExpressionNode {
    return new Not(expression(variable));
}

export function and(conjuncts: ExpressionNode[]): ExpressionNode {
    return new NAryLogicalExpression(conjuncts, 'and');
}
