/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi 2019. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as assert from 'assert';
import { PddlSyntaxTreeBuilder } from './src';

describe('PddlBracketNode', () => {

    describe('#getText()', () => {

        it('gets single node text', () => {
            // GIVEN
            const originalPddl = `(define )`;
            const tree = new PddlSyntaxTreeBuilder(originalPddl).getTree();

            // WHEN
            const actual = tree.getDefineNode().getText();

            // THEN
            assert.strictEqual(actual, originalPddl);
        });

        it('gets (:types ) node text', () => {
            // GIVEN
            const originalPddl = `(:types child1 child2 - parent)`;
            const tree = new PddlSyntaxTreeBuilder(originalPddl).getTree();

            // WHEN
            const actual = tree.getRootNode().getSingleChild().getText();

            // THEN
            assert.strictEqual(actual, originalPddl);
        });

        it('gets (:types text when the closing bracket is missing', () => {
            // GIVEN
            const originalPddl = `(:types child1 child2`;
            const tree = new PddlSyntaxTreeBuilder(originalPddl).getTree();

            // WHEN
            const actual = tree.getRootNode().getSingleChild().getText();

            // THEN
            assert.strictEqual(actual, originalPddl);
        });
    });

    describe('#getNestedText()', () => {

        it('gets single node text', () => {
            // GIVEN
            const originalPddl = `(define )`;
            const tree = new PddlSyntaxTreeBuilder(originalPddl).getTree();

            // WHEN
            const actual = tree.getDefineNode().getNestedText();

            // THEN
            assert.strictEqual(actual, ' ');
        });

        it('gets (:types ) node text', () => {
            // GIVEN
            const originalPddl = `(:types child1 child2 - parent)`;
            const tree = new PddlSyntaxTreeBuilder(originalPddl).getTree();

            // WHEN
            const actual = tree.getRootNode().getSingleChild().getNestedText();

            // THEN
            assert.strictEqual(actual, ' child1 child2 - parent');
        });
    });

    describe('#getNonCommentText()', () => {
        it('should return the same when no comments are present', () => {
            // GIVEN
            const originalPddl = `(:types child1 child2 - parent)`;
            const tree = new PddlSyntaxTreeBuilder(originalPddl).getTree();

            // WHEN
            const node = tree.getRootNode().getSingleChild(); // note that the root node is the DOCUMENT node
            const actual = node.getNonCommentText();

            // THEN
            assert.strictEqual(actual, originalPddl);
            assert.strictEqual(actual, node.getText(), "same as getText()");
        });

        it('strips comments', () => {
            // GIVEN
            const originalPrefixPddl = `(and (or (p)`;
            const comment = `; (q)`;
            const originalSuffixPddl = `\n))`;
            const originalPddl = originalPrefixPddl + comment + originalSuffixPddl;
            const tree = new PddlSyntaxTreeBuilder(originalPddl).getTree();

            // WHEN
            const node = tree.getRootNode().getSingleChild(); // note that the root node is the DOCUMENT node
            const actual = node.getNonCommentText();

            // THEN
            assert.strictEqual(actual, originalPrefixPddl + originalSuffixPddl);
        });

        it('gets (:types text when the closing bracket is missing', () => {
            // GIVEN
            const originalPddl = `(:types child1 child2`;
            const tree = new PddlSyntaxTreeBuilder(originalPddl).getTree();

            // WHEN
            const actual = tree.getRootNode().getSingleChild().getNonCommentText();

            // THEN
            assert.strictEqual(actual, originalPddl);
        });
    });
});