/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as assert from 'assert';
import { PddlSyntaxTreeBuilder } from './src';
import { PddlConstraintsParser } from './src';
import { NamedConditionConstraint, AfterConstraint, StrictlyAfterConstraint } from '../src';

describe('PddlConstraintsParser', () => {

    describe('#parseConstraints', () => {
        it('should parse empty', () => {
            // GIVEN
            const constraintsPddl = `
            (:constraints
            )
            `;
            const syntaxTree = new PddlSyntaxTreeBuilder(constraintsPddl).getTree();

            // WHEN
            const actual = new PddlConstraintsParser().parseConstraints(syntaxTree.getRootNode().getFirstOpenBracketOrThrow(':constraints'));

            // THEN
            assert.deepStrictEqual(actual, [], "there should be no constraints");
        });

        it('should parse one named named-condition constraint', () => {
            // GIVEN
            const name = 'g1';
            const condition = '(p)';
            const constraintsPddl = `
            (:constraints
                (name ${name} ${condition})
            )
            `;
            const syntaxTree = new PddlSyntaxTreeBuilder(constraintsPddl).getTree();

            // WHEN
            const actual = new PddlConstraintsParser().parseConstraints(syntaxTree.getRootNode().getFirstOpenBracketOrThrow(':constraints'));

            // THEN
            assert.strictEqual(actual.length, 1, "there should be one constraint");
            assert.ok(actual.every(c => c instanceof NamedConditionConstraint), 'constraint type');
            assert.deepStrictEqual(
                actual
                    .map(c => c as NamedConditionConstraint)
                    .map(c => [c.name, c.condition?.node.getText()]),
                [[name, condition]],
                "constraint content");
        });

        it('should parse one named named-condition constraint', () => {
            // GIVEN
            const name = 'g1';
            const condition = '(p)';
            const constraintsPddl = `
            (:constraints
                (named-condition ${name} ${condition})
            )
            `;
            const syntaxTree = new PddlSyntaxTreeBuilder(constraintsPddl).getTree();

            // WHEN
            const actual = new PddlConstraintsParser().parseConstraints(syntaxTree.getRootNode().getFirstOpenBracketOrThrow(':constraints'));

            // THEN
            assert.strictEqual(actual.length, 1, "there should be one constraint");
            assert.ok(actual.every(c => c instanceof NamedConditionConstraint), 'constraint type');
            assert.deepStrictEqual(
                actual
                    .map(c => c as NamedConditionConstraint)
                    .map(c => [c.name, c.condition?.node.getText()]),
                [[name, condition]],
                "constraint content");
        });

        it('should parse one named named-condition constraint inside conjunction', () => {
            // GIVEN
            const name = 'g1';
            const condition = '(p)';
            const constraintsPddl = `
            (:constraints (and
                (name ${name} ${condition})
            ))
            `;
            const syntaxTree = new PddlSyntaxTreeBuilder(constraintsPddl).getTree();

            // WHEN
            const actual = new PddlConstraintsParser().parseConstraints(syntaxTree.getRootNode().getFirstOpenBracketOrThrow(':constraints'));

            // THEN
            assert.strictEqual(actual.length, 1, "there should be one constraint");
            assert.ok(actual.every(c => c instanceof NamedConditionConstraint), 'constraint type');
            assert.deepStrictEqual(
                actual
                    .map(c => c as NamedConditionConstraint)
                    .map(c => [c.name, c.condition?.node.getText()]),
                [[name, condition]],
                "constraint content");
        });

        it('should parse one self-contained after-constraint constraint', () => {
            // GIVEN
            const condition1 = '(p)';
            const condition2 = '(q)';
            const constraintsPddl = `
            (:constraints
                (after ${condition1} ${condition2})
            )
            `;
            const syntaxTree = new PddlSyntaxTreeBuilder(constraintsPddl).getTree();

            // WHEN
            const actual = new PddlConstraintsParser().parseConstraints(syntaxTree.getRootNode().getFirstOpenBracketOrThrow(':constraints'));

            // THEN
            assert.strictEqual(actual.length, 1, "there should be one constraint");
            assert.ok(actual.every(c => c instanceof AfterConstraint), 'constraint type');

            assert.deepStrictEqual(
                actual
                    .map(c => c as AfterConstraint)
                    .map(c => [c.predecessor.condition?.getText(), c.successor.condition?.getText()]),
                [[condition1, condition2]],
                "constraint content");
        });

        it('should parse one after-constraint constraint', () => {
            // GIVEN
            const name1 = 'g1';
            const name2 = 'g2';
            const constraintsPddl = `
            (:constraints
                (after ${name1} ${name2})
            )
            `;
            const syntaxTree = new PddlSyntaxTreeBuilder(constraintsPddl).getTree();

            // WHEN
            const actual = new PddlConstraintsParser().parseConstraints(syntaxTree.getRootNode().getFirstOpenBracketOrThrow(':constraints'));

            // THEN
            assert.strictEqual(actual.length, 1, "there should be one constraint");
            assert.ok(actual.every(c => c instanceof AfterConstraint), 'constraint type');
            assert.deepStrictEqual(
                actual
                    .map(c => c as AfterConstraint)
                    .map(c => [c.predecessor.name, c.successor.name]),
                [[name1, name2]],
                "constraint content");
        });

        it('should parse two named named-condition constraints and one after constraint', () => {
            // GIVEN
            const name1 = 'g1';
            const condition1 = '(p)';
            const name2 = 'g2';
            const condition2 = '(q)';
            const constraintsPddl = `
            (:constraints (and
                (name ${name1} ${condition1})
                (name ${name2} ${condition2})
                (after ${name1} ${name2})
            ))
            `;
            const syntaxTree = new PddlSyntaxTreeBuilder(constraintsPddl).getTree();

            // WHEN
            const actual = new PddlConstraintsParser().parseConstraints(syntaxTree.getRootNode().getFirstOpenBracketOrThrow(':constraints'));

            // THEN
            assert.strictEqual(actual.length, 3, "there should be N constraints");
            assert.ok(actual[0] instanceof NamedConditionConstraint, 'constraint0 type');
            assert.ok(actual[1] instanceof NamedConditionConstraint, 'constraint1 type');
            assert.ok(actual[2] instanceof AfterConstraint, 'constraint2 type');
        });

        it('should parse two after constraint with common predecessor', () => {
            // GIVEN
            const g1 = '(g1)';
            const g2 = '(g2)';
            const g3 = '(g3)';
            const constraintsPddl = `
            (:constraints (and
                (after ${g1} ${g2})
                (after ${g1} ${g3})
            ))
            `;
            const syntaxTree = new PddlSyntaxTreeBuilder(constraintsPddl).getTree();

            // WHEN
            const actual = new PddlConstraintsParser().parseConstraints(syntaxTree.getRootNode().getFirstOpenBracketOrThrow(':constraints'));

            // THEN
            assert.strictEqual(actual.length, 2, "there should be N constraints");
            assert.ok(actual[0] instanceof AfterConstraint, 'constraint0 type');
            assert.ok(actual[1] instanceof AfterConstraint, 'constraint1 type');
        });

        it('should parse one strictly-after-constraint constraint', () => {
            // GIVEN
            const name1 = 'g1';
            const name2 = 'g2';
            const constraintsPddl = `
            (:constraints
                (strictly-after ${name1} ${name2})
            )
            `;
            const syntaxTree = new PddlSyntaxTreeBuilder(constraintsPddl).getTree();

            // WHEN
            const actual = new PddlConstraintsParser().parseConstraints(syntaxTree.getRootNode().getFirstOpenBracketOrThrow(':constraints'));

            // THEN
            assert.strictEqual(actual.length, 1, "there should be one constraint");
            assert.ok(actual.every(c => c instanceof StrictlyAfterConstraint), 'constraint type');
            assert.deepStrictEqual(
                actual
                    .map(c => c as AfterConstraint)
                    .map(c => [c.predecessor.name, c.successor.name]),
                [[name1, name2]],
                "constraint content");
        });
    });
});
