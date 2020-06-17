/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

const expect = require('chai').expect;
import { PddlSyntaxTreeBuilder, NumericExpressionParser } from './src';
import { VariableExpression, Sum, Product, NumericLiteral, Division, ValueMap } from '../src';

describe('NumericExpressionParser', () => {

    function createNumericExpressionParser(metricPddl: string): NumericExpressionParser {
        const syntaxTree = new PddlSyntaxTreeBuilder(metricPddl).getTree();
        return new NumericExpressionParser(
            syntaxTree.getRootNode().getSingleNonWhitespaceChild());
    }

    describe('#getExpression', () => {

        it('it parses variable', () => {
            // GIVEN
            const expressionPddl = "(cost o1)";

            // WHEN
            const expression = createNumericExpressionParser(expressionPddl).getExpression();

            // THEN
            expect(expression).to.not.be.undefined;
            expect(expression).to.be.instanceOf(VariableExpression);
            const variableExpression = (expression as VariableExpression);
            expect(variableExpression.name).to.equal('cost o1');
            expect(variableExpression.variable.getFullName()).to.equal('cost o1');
            expect(variableExpression.getVariableNames()).to.deep.equal(['cost o1']);
            const context = new ValueMap("cost o1", 13);
            expect(variableExpression.evaluate(context)).to.equal(13);
        });

        it('it parses literal', () => {
            // GIVEN
            const value = 123.654;
            const expressionPddl = " " + value;

            // WHEN
            const expression = createNumericExpressionParser(expressionPddl).getExpression();

            // THEN
            expect(expression).to.not.be.undefined;
            expect(expression).to.be.instanceOf(NumericLiteral);
            const literal = (expression as NumericLiteral);
            expect(literal.value).to.equal(value);
            expect(literal.getVariableNames()).to.deep.equal([]);
            const context = new ValueMap("cost", 13);
            expect(literal.evaluate(context)).to.equal(value);
        });

        it('it parses literal in scientific notation', () => {
            // GIVEN
            const value = 1.23e-5;
            const expressionPddl = " " + value;

            // WHEN
            const expression = createNumericExpressionParser(expressionPddl).getExpression();

            // THEN
            expect(expression).to.not.be.undefined;
            expect(expression).to.be.instanceOf(NumericLiteral);
            const literal = (expression as NumericLiteral);
            expect(literal.value).to.equal(value);
            expect(literal.getVariableNames()).to.deep.equal([]);
            const context = new ValueMap("cost", 13);
            expect(literal.evaluate(context)).to.equal(value);
        });

        it('it parses sum of two', () => {
            // GIVEN
            const expressionPddl = "(+ (cost1) (cost2))";

            // WHEN
            const expression = createNumericExpressionParser(expressionPddl).getExpression();

            // THEN
            expect(expression).to.not.be.undefined;
            expect(expression).to.be.instanceOf(Sum);
            const sum = (expression as Sum);
            expect(sum.operator).to.equal('+');
            expect(sum.getVariableNames()).to.deep.equal(['cost1', 'cost2']);
            const context = new ValueMap("cost1", 13, "cost2", 42);
            expect(sum.evaluate(context)).to.equal(55);
        });
        
        it('it parses sum of three with nested sum', () => {
            // GIVEN
            const expressionPddl = "(+ (cost1) (cost2) (+ (cost3) (cost4)))";

            // WHEN
            const expression = createNumericExpressionParser(expressionPddl).getExpression();

            // THEN
            expect(expression).to.not.be.undefined;
            expect(expression).to.be.instanceOf(Sum);
            const sum = (expression as Sum);
            expect(sum.operator).to.equal('+');
            expect(sum.getVariableNames()).to.deep.equal(['cost1', 'cost2', 'cost3', 'cost4']);
            const context = new ValueMap("cost1", 1, "cost2", 2, "cost3", 3, "cost4", 4);
            expect(sum.evaluate(context)).to.equal(10);
        });
        
        it('it parses product of two', () => {
            // GIVEN
            const expressionPddl = "(* (cost1) (cost2))";

            // WHEN
            const expression = createNumericExpressionParser(expressionPddl).getExpression();

            // THEN
            expect(expression).to.not.be.undefined;
            expect(expression).to.be.instanceOf(Product);
            const product = (expression as Product);
            expect(product.operator).to.equal('*');
            expect(product.getVariableNames()).to.deep.equal(['cost1', 'cost2']);
            const context = new ValueMap("cost1", 3, "cost2", 2);
            expect(product.evaluate(context)).to.equal(6);
        });

        it('it parses division of two', () => {
            // GIVEN
            const expressionPddl = "(/ (cost1) (cost2))";

            // WHEN
            const expression = createNumericExpressionParser(expressionPddl).getExpression();

            // THEN
            expect(expression).to.not.be.undefined;
            expect(expression).to.be.instanceOf(Division);
            const division = (expression as Division);
            expect(division.operator).to.equal('/');
            expect(division.getVariableNames()).to.deep.equal(['cost1', 'cost2']);
            const context = new ValueMap("cost1", 3, "cost2", 2);
            expect(division.evaluate(context)).to.equal(1.5);
        });

        it('it parses a combination', () => {
            // GIVEN
            const expressionPddl = "(/ (- (cost) (minCost)) 2)";

            // WHEN
            const expression = createNumericExpressionParser(expressionPddl).getExpression();

            // THEN
            expect(expression).to.not.be.undefined;
            expect(expression).to.be.instanceOf(Division);
            const division = (expression as Division);
            expect(division.getVariableNames()).to.deep.equal(['cost', 'minCost']);
            const context = new ValueMap("cost", 3, "minCost", 2);
            expect(division.evaluate(context)).to.equal(0.5);
        });

    });
});