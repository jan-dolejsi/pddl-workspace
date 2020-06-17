/* --------------------------------------------------------------------------------------------
* Copyright (c) Jan Dolejsi. All rights reserved.
* Licensed under the MIT License. See License.txt in the project root for license information.
* ------------------------------------------------------------------------------------------ */

import { Variable } from "./language";

export interface EvaluationContext {
    get(variableName: string): number | boolean | undefined;
}

export class ValueMap extends Map<string, number | boolean> implements EvaluationContext {
    constructor(...keyValues: Array<string | number | boolean>) {
        super(ValueMap.toEntryPairs(keyValues));
    }

    static toEntryPairs(keyValues: Array<string | number | boolean>): Iterable<readonly [string, number | boolean]> {
        if (keyValues.length % 2 === 1) {
            throw new Error("Must supply an even number of arguments to eval context");
        }

        const entries: [string, number | boolean][] = [];

        for (let index = 0; index < keyValues.length; index += 2) {
            const key = keyValues[index];
            const value = keyValues[index + 1];

            if (typeof (key) !== "string") {
                throw new Error(`Expect string, but found ${key}`);
            }

            if (typeof (value) !== "number" && typeof (value) !== "boolean") {
                throw new Error(`Expect number|boolean, but found ${value}`);
            }

            entries.push([key as string, value as number | boolean]);
        }

        return entries;
    }
}

/**
 * Numeric expression.
 */
export abstract class NumericExpression {
    abstract getVariables(): Variable[];
    abstract evaluate(context: EvaluationContext): number | undefined;
    getVariableNames(): string[] {
        return this.getVariables().map(v => v.getFullName());
    }
}

export class VariableExpression extends NumericExpression {
    readonly variable: Variable;
    
    constructor(public readonly name: string) {
        super();
        this.variable = Variable.fromGrounded(name);
    }

    getVariables(): Variable[] {
        return [this.variable];
    }

    evaluate(context: EvaluationContext): number | undefined {
        const value = context.get(this.name);
        if (typeof (value) === "number") {
            return value;
        } else {
            return undefined;
        }
    }
}

export class NumericLiteral extends NumericExpression {
    constructor(public readonly value: number) {
        super();
    }

    getVariables(): Variable[] {
        return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    evaluate(context: EvaluationContext): number | undefined {
        return this.value;
    }
}
export abstract class BinaryExpression extends NumericExpression {
    constructor(public readonly operator: string, public readonly left: NumericExpression, public readonly right: NumericExpression) {
        super();
    }

    getVariables(): Variable[] {
        return [this.left, this.right]
            .map(child => child.getVariables())
            .reduce((prev, curr) => prev.concat(curr), []);
    }
}
export abstract class NAryExpression extends NumericExpression {
    constructor(public readonly operator: string, public readonly children: NumericExpression[]) {
        super();
    }

    getVariables(): Variable[] {
        return this.children
            .map(child => child.getVariables())
            .reduce((prev, curr) => prev.concat(curr), []);
    }

    abstract reduce(left: number | undefined, right: number | undefined): number | undefined;

    abstract identity(): number;

    evaluate(context: EvaluationContext): number | undefined {
        return this.children
            .map(child => child.evaluate(context))
            .reduce(this.reduce, this.identity());
    }
}

export class Sum extends NAryExpression {
    constructor(children: NumericExpression[]) {
        super("+", children);
    }
    reduce(left: number | undefined, right: number | undefined): number | undefined {
        if (left !== undefined && right !== undefined) {
            return left + right;
        }
        return undefined;
    }
    identity(): number {
        return 0;
    }
}

export class Subtraction extends BinaryExpression {
    constructor(left: NumericExpression, right: NumericExpression) {
        super("+", left, right);
    }
    evaluate(context: EvaluationContext): number | undefined {
        const leftValue = this.left.evaluate(context);
        const rightValue = this.right.evaluate(context);

        return leftValue !== undefined && rightValue !== undefined ?
            leftValue - rightValue :
            undefined;
    }
}

export class Product extends NAryExpression {
    constructor(children: NumericExpression[]) {
        super("*", children);
    }
    reduce(left: number | undefined, right: number | undefined): number | undefined {
        if (left !== undefined && right !== undefined) {
            return left * right;
        }
        return undefined;
    }
    identity(): number {
        return 1;
    }
}

export class Division extends BinaryExpression {
    constructor(left: NumericExpression, right: NumericExpression) {
        super("/", left, right);
    }
    evaluate(context: EvaluationContext): number | undefined {
        const leftValue = this.left.evaluate(context);
        const rightValue = this.right.evaluate(context);

        return leftValue !== undefined && rightValue !== undefined ?
            leftValue / rightValue :
            undefined;
    }
}