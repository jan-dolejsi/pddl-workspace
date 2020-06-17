/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

const expect = require('chai').expect;
import { PddlSyntaxTreeBuilder } from './src';
import { SimpleDocumentPositionResolver, MetricDirection } from '../src';
import { MetricParser } from './src';
import { Sum, VariableExpression, NumericLiteral } from '../src';

describe('MetricParser', () => {

    function createMetricParser(metricPddl: string): MetricParser {
        const syntaxTree = new PddlSyntaxTreeBuilder(metricPddl).getTree();
        return new MetricParser(
            syntaxTree.getRootNode().getFirstOpenBracketOrThrow(':metric'), 
            new SimpleDocumentPositionResolver(metricPddl));
    }

    describe('#getMetric', () => {

        it('extracts minimize cost metric', () => {
            // GIVEN
            const metricPddl = ";Metric name\n(:metric minimize (cost))";

            // WHEN
            const metric = createMetricParser(metricPddl).getMetric();

            // THEN
            expect(metric?.getDirection()).to.be.equal(MetricDirection.MINIMIZE);
            expect(metric?.getDocumentation()).to.deep.equal(['Metric name']);
        });

        it('extracts maximize cost metric', () => {
            // GIVEN
            const metricPddl = ";Metric name\n(:metric maximize (cost))";

            // WHEN
            const metric = createMetricParser(metricPddl).getMetric();

            // THEN
            expect(metric?.getDirection()).to.be.equal(MetricDirection.MAXIMIZE);
            expect(metric?.getDocumentation()).to.deep.equal(['Metric name']);
        });
        
        it('extracts minimize sum metric', () => {
            // GIVEN
            const metricPddl = ";Metric name\n(:metric minimize (+ (cost) 2))";

            // WHEN
            const metric = createMetricParser(metricPddl).getMetric();

            // THEN
            expect(metric).to.not.be.undefined;
            expect(metric?.getDirection()).to.be.equal(MetricDirection.MINIMIZE);
            expect(metric?.getDocumentation()).to.deep.equal(['Metric name']);
            expect(metric?.getExpression()).to.deep.equal(new Sum([new VariableExpression("cost"), new NumericLiteral(2)]));
        });
    });
});