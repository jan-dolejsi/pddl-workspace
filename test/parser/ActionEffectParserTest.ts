/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as assert from 'assert';
import { describe, it, expect } from 'vitest';
import { ActionEffectParser, MakeTrueEffect, MakeFalseEffect, IncreaseEffect } from './src';
import { PddlSyntaxTreeBuilder } from './src';
import { Variable } from '../src';

describe('ActionEffectParser', () => {

    describe('#parseEffect', () => {
        it('should parse a proposition', () => {
            // GIVEN
            const predicate = 'p';
            const pddlText = `(${predicate})`;

            // WHEN
            const syntaxTree = new PddlSyntaxTreeBuilder(pddlText).getTree();
            const node = syntaxTree.getRootNode().getSingleChild();
            const actual = ActionEffectParser.parseEffect(node);

            // THEN
            expect(actual, "actual should equal expected").to.deep.equal(new MakeTrueEffect(node, new Variable(predicate)));
        });

        it('should parse a negation', () => {
            // GIVEN
            const predicate = 'p';
            const pddlText = `(not (${predicate}))`;

            // WHEN
            const syntaxTree = new PddlSyntaxTreeBuilder(pddlText).getTree();
            const node = syntaxTree.getRootNode().getSingleChild();
            const actual = ActionEffectParser.parseEffect(node);

            // THEN
            assert.deepStrictEqual(actual, new MakeFalseEffect(node, new Variable(predicate)), "actual should equal expected");
        });
        
        it('should parse a conjunction', () => {
            // GIVEN
            const predicate = 'p';
            const pddlText = `(and (${predicate}))`;

            // WHEN
            const syntaxTree = new PddlSyntaxTreeBuilder(pddlText).getTree();
            const node = syntaxTree.getRootNode().getSingleChild();
            const actual = ActionEffectParser.parseEffect(node);

            // THEN
            assert.deepStrictEqual(actual, new MakeTrueEffect(node.getSingleNonWhitespaceChild(), new Variable(predicate)), "actual should equal expected");
        });
        
        it('should parse a at start propositional effect', () => {
            // GIVEN
            const predicate = 'p';
            const pddlText = `(at start (${predicate}))`;

            // WHEN
            const syntaxTree = new PddlSyntaxTreeBuilder(pddlText).getTree();
            const node = syntaxTree.getRootNode().getSingleChild();
            const actual = ActionEffectParser.parseEffect(node);

            // THEN
            assert.deepStrictEqual(actual, new MakeTrueEffect(node.getSingleNonWhitespaceChild(), new Variable(predicate)), "actual should equal expected");
        });
        
        it('should parse a at start increase effect', () => {
            // GIVEN
            const fluent = 'f';
            const expression = "3";
            const pddlText = `(at start (increase (${fluent}) ${expression}))`;

            // WHEN
            const syntaxTree = new PddlSyntaxTreeBuilder(pddlText).getTree();
            const increaseNode = syntaxTree.getRootNode().getSingleChild().getSingleNonWhitespaceChild();
            const expressionNode = syntaxTree.getNodeAt(pddlText.indexOf(expression) + 1);
            const actual = ActionEffectParser.parseEffect(increaseNode);

            // THEN
            assert.deepStrictEqual(actual, new IncreaseEffect(increaseNode, new Variable(fluent), expressionNode), "actual should equal expected");
        });
    });
});
