/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi 2019. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as assert from 'assert';
import { PddlSyntaxTreeBuilder } from './src';
import { PddlTokenType } from './src';
import { PddlSyntaxNode } from './src';
import { parseParameters } from './src';

describe('PddlSyntaxNode', () => {

    describe('#getFirstOpenBracketOrThrow', () => {
        it('gets domain node', () => {
            // GIVEN
            const domainPddl = `(define (domain domain_name))`;
            const tree = new PddlSyntaxTreeBuilder(domainPddl).getTree();

            // WHEN
            const domainNode = tree.getDefineNode().getFirstOpenBracketOrThrow('domain');

            // THEN
            assert.notStrictEqual(domainNode, undefined, 'there should be a (domain element');
        });
    });

    describe('#getFirstOpenBracketOrThrow', () => {
        it('throws', () => {
            // GIVEN
            const domainPddl = `(define (problem name))`;
            const tree = new PddlSyntaxTreeBuilder(domainPddl).getTree();

            // THEN
            assert.throws(() => {
                // WHEN
                tree.getDefineNode().getFirstOpenBracketOrThrow('domain');
            });
        });

        it('gets problem', () => {
            // GIVEN
            const domainPddl = `(define (problem name))`;
            const tree = new PddlSyntaxTreeBuilder(domainPddl).getTree();

            // THEN
            assert.ok(tree.getDefineNode().getFirstOpenBracketOrThrow('problem'));
        });
    });

    describe('#getKeywordOpenBracket', () => {
        it('returns undefined for missing keyword', () => {
            // GIVEN
            const actionPddl = `(action)`;
            const action = new PddlSyntaxTreeBuilder(actionPddl).getTree().getRootNode().getSingleChild();

            // WHEN
            const keywordBracket = action.getKeywordOpenBracket('keyword');

            // THEN
            assert.strictEqual(keywordBracket, undefined);
        });

        it('returns undefined for missing brackets nested in the keyword', () => {
            // GIVEN
            const actionPddl = `(action :keyword)`;
            const action = new PddlSyntaxTreeBuilder(actionPddl).getTree().getRootNode().getSingleChild();

            // WHEN
            const keywordBracket = action.getKeywordOpenBracket('keyword');

            // THEN
            assert.strictEqual(keywordBracket, undefined);
        });

        it('returns empty brackets', () => {
            // GIVEN
            const actionPddl = `(action :keyword())`;
            const action = new PddlSyntaxTreeBuilder(actionPddl).getTree().getRootNode().getSingleChild();

            // WHEN
            const keywordBracket = action.getKeywordOpenBracket('keyword');

            // THEN
            assert.ok(keywordBracket!==undefined);
            assert.strictEqual(keywordBracket?.getNestedChildren().length, 0);
        });

        it('returns bracket contents', () => {
            // GIVEN
            const actionPddl = `(action :keyword(p))`;
            const action = new PddlSyntaxTreeBuilder(actionPddl).getTree().getRootNode().getSingleChild();

            // WHEN
            const keywordBracket = action.getKeywordOpenBracket('keyword');

            // THEN
            assert.ok(keywordBracket!==undefined);
            assert.strictEqual(keywordBracket?.getNestedChildren().length, 1);
            assert.strictEqual(keywordBracket?.getText(), '(p)');
        });

        it('returns bracket contents after whitespace', () => {
            // GIVEN
            const actionPddl = `(action :keyword         (p))`;
            const action = new PddlSyntaxTreeBuilder(actionPddl).getTree().getRootNode().getSingleChild();

            // WHEN
            const keywordBracket = action.getKeywordOpenBracket('keyword');

            // THEN
            assert.ok(keywordBracket!==undefined);
            assert.strictEqual(keywordBracket?.getNestedChildren().length, 1);
            assert.strictEqual(keywordBracket?.getText(), '(p)');
        });

        it('returns non-trivial bracket contents - conjunction', () => {
            // GIVEN
            const actionPddl = `(action :keyword (and (p)(q)))`;
            const action = new PddlSyntaxTreeBuilder(actionPddl).getTree().getRootNode().getSingleChild();

            // WHEN
            const keywordBracket = action.getKeywordOpenBracket('keyword');

            // THEN
            assert.ok(keywordBracket!==undefined);
            assert.strictEqual(keywordBracket?.getNonWhitespaceChildren().length, 2);
            assert.strictEqual(keywordBracket?.getToken().tokenText, '(and');
        });

        it("returns capital keyword's bracket contents", () => {
            // GIVEN
            const actionPddl = `(action :KEYWORD(p))`;
            const action = new PddlSyntaxTreeBuilder(actionPddl).getTree().getRootNode().getSingleChild();

            // WHEN
            const keywordBracket = action.getKeywordOpenBracket('keyword');

            // THEN
            assert.ok(keywordBracket!==undefined);
            assert.strictEqual(keywordBracket?.getNestedChildren().length, 1);
            assert.strictEqual(keywordBracket?.getText(), '(p)');
        });
    });

    describe('#getChildren()', () => {

        it('gets define node', () => {
            // GIVEN
            const domainPddl = `(define (domain domain_name))`;
            const tree = new PddlSyntaxTreeBuilder(domainPddl).getTree();
            const defineNode = tree.getDefineNode();

            // WHEN
            const children = defineNode.getChildren();

            // THEN
            const tokenTypes = children.map(f => f.getToken().type);
            assert.deepStrictEqual(tokenTypes, [
                PddlTokenType.Whitespace,
                PddlTokenType.OpenBracketOperator, // (domain ...)
                PddlTokenType.CloseBracket,
            ]);
        });

        it('gets two predicate children', () => {
            // GIVEN
            const predicatesPddl = `(:predicates (p1)(p2))`;
            const tree = new PddlSyntaxTreeBuilder(predicatesPddl).getTree();
            const predicatesNode = tree.getRootNode().getFirstOpenBracketOrThrow(':predicates');

            // WHEN
            const children = predicatesNode.getChildren();

            // THEN
            const tokenTypes = children.map(f => f.getToken().type);
            assert.deepStrictEqual(tokenTypes, [
                PddlTokenType.Whitespace,
                PddlTokenType.OpenBracket,
                PddlTokenType.OpenBracket,
                PddlTokenType.CloseBracket
            ]);
        });
    });

    describe('#getNestedChildren()', () => {

        it('gets define node', () => {
            // GIVEN
            const domainPddl = `(define (domain domain_name))`;
            const tree = new PddlSyntaxTreeBuilder(domainPddl).getTree();
            const defineNode = tree.getDefineNode();

            // WHEN
            const children = defineNode.getNestedChildren();

            // THEN
            const tokenTypes = children.map(f => f.getToken().type);
            assert.deepStrictEqual(tokenTypes, [
                PddlTokenType.Whitespace,
                PddlTokenType.OpenBracketOperator, // (domain ...)
            ]);
        });
    });

    describe('#getChildrenRecursively()', () => {

        it('it finds no child', () => {
            // GIVEN
            const domainPddl = `(define)`;

            const tree = new PddlSyntaxTreeBuilder(domainPddl).getTree();
            const defineNode = tree.getDefineNode();

            // WHEN
            const children: PddlSyntaxNode[] = [];
            defineNode.getChildrenRecursively(() => true, (node: PddlSyntaxNode) => children.push(node));

            // THEN
            assert.strictEqual(children.length, 0, 'there should be zero matches');
        });

        it('it finds one whitespace', () => {
            // GIVEN
            const domainPddl = `(define )`;

            const tree = new PddlSyntaxTreeBuilder(domainPddl).getTree();
            const defineNode = tree.getDefineNode();

            // WHEN
            const children: PddlSyntaxNode[] = [];
            defineNode.getChildrenRecursively(() => true, (node: PddlSyntaxNode) => children.push(node));

            // THEN
            assert.strictEqual(children.length, 1, 'there should be one match');
            assert.strictEqual(children[0].getToken().type, PddlTokenType.Whitespace);
        });

        it('it finds no reference to predicate in comment', () => {
            // GIVEN
            const domainPddl = "(define ; (p)\n)";

            const tree = new PddlSyntaxTreeBuilder(domainPddl).getTree();
            const defineNode = tree.getDefineNode();

            // WHEN
            const children: PddlSyntaxNode[] = [];
            defineNode.getChildrenRecursively(node => node.getToken().type === PddlTokenType.OpenBracket
                && node.getSingleChild().getToken().tokenText === 'p',
                (node: PddlSyntaxNode) => children.push(node));

            // THEN
            assert.strictEqual(children.length, 0, 'there should be zero matches');
        });


        it('it finds two reference to predicate', () => {
            // GIVEN
            const domainPddl = "(define (p)\n (sub (p)))";

            const tree = new PddlSyntaxTreeBuilder(domainPddl).getTree();
            const defineNode = tree.getDefineNode();

            // WHEN
            const children: PddlSyntaxNode[] = [];
            defineNode.getChildrenRecursively(node => node.getToken().type === PddlTokenType.OpenBracket
                && node.getSingleChild().getToken().tokenText === 'p',
                (node: PddlSyntaxNode) => children.push(node));

            // THEN
            assert.strictEqual(children.length, 2, 'there should be two matches');
        });

    });

    /*
    describe('#getChildRecursively()', () => {
        it('returns undefined if no child matched', () => {
            // GIVEN
            const input = `(parent (child grandchild))`;
            const tree = new PddlSyntaxTreeBuilder(input).getTree();
            const rootNode = tree.getRootNode().getSingleChild();

            // WHEN
            const child = rootNode.getChildRecursively(PddlTokenType.Comment, /./);

            // THEN
            assert.strictEqual(child, undefined);
        });

        it('does not find itself', () => {
            // GIVEN
            const input = `(parent (child grandchild))`;
            const tree = new PddlSyntaxTreeBuilder(input).getTree();
            const rootNode = tree.getRootNode().getSingleChild();

            // WHEN
            const child = rootNode.getChildRecursively(PddlTokenType.OpenBracket, /\(parent/);

            // THEN
            assert.strictEqual(child, undefined);
        });
        
        it('finds first child', () => {
            // GIVEN
            const input = `(parent (and grandchild))`;
            const tree = new PddlSyntaxTreeBuilder(input).getTree();
            const rootNode = tree.getRootNode().getSingleChild();

            // WHEN
            const child = rootNode.getChildRecursively(PddlTokenType.OpenBracketOperator, /\(and/);

            // THEN
            assert.ok(child);
            assert.strictEqual(child.getToken().tokenText, '(and');
        });
        
        it('finds grand child', () => {
            // GIVEN
            const input = `(parent (and grandchild))`;
            const tree = new PddlSyntaxTreeBuilder(input).getTree();
            const rootNode = tree.getRootNode().getSingleChild();

            // WHEN
            const child = rootNode.getChildRecursively(PddlTokenType.Other, /grandchild/);

            // THEN
            assert.ok(child);
            assert.strictEqual(child.getToken().tokenText, 'grandchild');
        });
    });
    */

    describe('#getNonWhitespaceChildren()', () => {

        it('gets all requirements', () => {
            // GIVEN
            const domainPddl = `(:requirements :req1 :req2)`;
            const tree = new PddlSyntaxTreeBuilder(domainPddl).getTree();
            const requirementsNode = tree.getRootNode().getFirstOpenBracketOrThrow(':requirements');

            // WHEN
            const children = requirementsNode.getNonWhitespaceChildren();

            // THEN
            const tokenText = children.map(f => f.getToken().tokenText);
            assert.deepStrictEqual(tokenText, [
                ':req1',
                ':req2'
            ]);
        });
    });

    describe('#getText()', () => {

        it('gets single node text', () => {
            // GIVEN
            const originalPddl = `name`;
            const tree = new PddlSyntaxTreeBuilder(originalPddl).getTree();

            // WHEN
            const actual = tree.getRootNode().getText();

            // THEN
            assert.strictEqual(actual, originalPddl);
        });

        it('gets type declaration node text', () => {
            // GIVEN
            const originalPddl = `child1 child2 - parent`;
            const tree = new PddlSyntaxTreeBuilder(originalPddl).getTree();

            // WHEN
            const actual = tree.getRootNode().getText();

            // THEN
            assert.strictEqual(actual, originalPddl);
        });
    });

    describe('#getNestedText()', () => {

        it('gets single nested node text i.e. empty', () => {
            // GIVEN
            const originalPddl = `name`;
            const tree = new PddlSyntaxTreeBuilder(originalPddl).getTree();

            // WHEN
            const actual = tree.getRootNode() // note that the root node is the DOCUMENT node
                .getNestedText();

            // THEN
            assert.strictEqual(actual, originalPddl);
        });

        it('gets (:types) node text', () => {
            // GIVEN
            const originalPddl = `child1 child2 - parent`;
            const tree = new PddlSyntaxTreeBuilder(originalPddl).getTree();

            // WHEN
            const actual = tree.getRootNode().getNestedText();

            // THEN
            assert.strictEqual(actual, originalPddl);
        });
    });

    describe('#getNonCommentText()', () => {
        it('should return the same when no comments are present', () => {
            // GIVEN
            const originalPddl = `:precondition (and (p))`;
            const tree = new PddlSyntaxTreeBuilder(originalPddl).getTree();

            // WHEN
            const node = tree.getRootNode().getSingleChild(); // note that the root node is the DOCUMENT node
            const actual = node.getNonCommentText();

            // THEN
            assert.strictEqual(actual, originalPddl);
            assert.strictEqual(actual, node.getText(), "same as getText()");
        });

        it('returns empty for comment', () => {
            // GIVEN
            const originalPddl = `;comment`;
            const tree = new PddlSyntaxTreeBuilder(originalPddl).getTree();

            // WHEN
            const node = tree.getRootNode().getSingleChild(); // note that the root node is the DOCUMENT node
            const actual = node.getNonCommentText();

            // THEN
            assert.strictEqual(actual, '', "should be empty");
        });

        it('strips comments', () => {
            // GIVEN
            const originalPrefixPddl = `:precondition (and `;
            const comment = `; (p)`;
            const originalSuffixPddl = `\n)`;
            const originalPddl = originalPrefixPddl + comment + originalSuffixPddl;
            const tree = new PddlSyntaxTreeBuilder(originalPddl).getTree();

            // WHEN
            const node = tree.getRootNode().getSingleChild(); // note that the root node is the DOCUMENT node
            const actual = node.getNonCommentText();

            // THEN
            assert.strictEqual(actual, originalPrefixPddl + originalSuffixPddl);
        });
    });

    describe('#findAncestor()', () => {
        it('returns null for non-existent ancestor', () => {
            // GIVEN
            const originalPddl = `(:process :parameters(?p - some-type))`;
            const paramNode = new PddlSyntaxTreeBuilder(originalPddl).getTree().getNodeAt(originalPddl.indexOf('?p'));

            // WHEN
            const actual = paramNode.findAncestor(PddlTokenType.OpenBracketOperator, /^\(\s*:action$/);

            // THEN
            assert.strictEqual(actual, undefined);
        });

        it('finds ancestor', () => {
            // GIVEN
            const originalPddl = `(:action :parameters(?p - some-type))`;
            const paramNode = new PddlSyntaxTreeBuilder(originalPddl).getTree().getNodeAt(originalPddl.indexOf('?p'));

            // WHEN
            const actual = paramNode.findAncestor(PddlTokenType.OpenBracketOperator, /^\(\s*:action$/);

            // THEN
            assert.ok(actual);
            assert.strictEqual(actual?.getToken().tokenText, '(:action');
        });
    });

    describe('#findParametrisableScope()', () => {
        it('returns null for non-existent scope', () => {
            // GIVEN
            const originalPddl = `(:something :parameters(?p - some-type))`;
            const paramNode = new PddlSyntaxTreeBuilder(originalPddl).getTree().getNodeAt(originalPddl.indexOf('?p') + 1);

            // WHEN
            const actual = paramNode.findParametrisableScope('p');

            // THEN
            assert.ok(actual !== undefined);
            assert.strictEqual(actual?.getToken().type, PddlTokenType.OpenBracket);
        });

        it('finds action ancestor', () => {
            // GIVEN
            const originalPddl = `(:action :parameters(?p - some-type))`;
            const paramNode = new PddlSyntaxTreeBuilder(originalPddl).getTree().getNodeAt(originalPddl.indexOf('?p') + 1);

            // WHEN
            const actual = paramNode.findParametrisableScope('p');

            // THEN
            assert.ok(actual !== undefined);
            assert.strictEqual(actual?.getToken().tokenText, '(:action');
        });

        it('finds durative action ancestor', () => {
            // GIVEN
            const originalPddl = `(:durative-action :parameters(?p - some-type))`;
            const paramNode = new PddlSyntaxTreeBuilder(originalPddl).getTree().getNodeAt(originalPddl.indexOf('?p') + 1);

            // WHEN
            const actual = paramNode.findParametrisableScope('p');

            // THEN
            assert.ok(actual !== undefined);
            assert.strictEqual(actual?.getToken().tokenText, '(:durative-action');
        });

        it('finds `forall` ancestor', () => {
            // GIVEN
            const originalPddl = `(forall (?p - some-type))`;
            const paramNode = new PddlSyntaxTreeBuilder(originalPddl).getTree().getNodeAt(originalPddl.indexOf('?p') + 1);

            // WHEN
            const actual = paramNode.findParametrisableScope('p');

            // THEN
            assert.ok(actual !== undefined);
            assert.strictEqual(actual?.getToken().tokenText, '(forall');
        });

        it('finds `:derived` ancestor', () => {
            // GIVEN
            const originalPddl = `(:derived (notP ?p1 - type1)
            (not (p ?p1))
        )`;
            const paramNode = new PddlSyntaxTreeBuilder(originalPddl).getTree().getNodeAt(originalPddl.lastIndexOf('?p1') + 1);

            // WHEN
            const actual = paramNode.findParametrisableScope('p1');

            // THEN
            assert.ok(actual !== undefined);
            assert.strictEqual(actual?.getToken().tokenText, '(:derived');
        });

        it('finds `:action`, although it is nesting `forall` ancestor', () => {
            // GIVEN
            const originalPddl = `(:action :parameters (?p1 - some-type) (forall (?p2 - some-type) (p ?p1 ?p2))`;
            const paramNode = new PddlSyntaxTreeBuilder(originalPddl).getTree().getNodeAt(originalPddl.lastIndexOf('?p1') + 1);

            // WHEN
            const actual = paramNode.findParametrisableScope('p1');

            // THEN
            assert.ok(actual !== undefined);
            assert.strictEqual(actual?.getToken().tokenText, '(:action');
        });
    });

    describe('#getParameterDefinition()', () => {
        it('finds parameter definition in (:action', () => {
            // GIVEN
            const originalPddl = `(:action :parameters (?p1 - some-type) (forall (?p2 - some-type) (p ?p1 ?p2))`;
            const paramNode = new PddlSyntaxTreeBuilder(originalPddl).getTree().getNodeAt(originalPddl.lastIndexOf('?p1') + 1);

            const parameterName = "p1";
            // WHEN
            const scope = paramNode.findParametrisableScope(parameterName);
            const parameterDefinitionNode = scope && scope.getParameterDefinition();
            const parameter = parameterDefinitionNode && parseParameters(parameterDefinitionNode.getText()).find(p => p.name === parameterName);

            // THEN
            assert.ok(parameter !== undefined);
            assert.strictEqual(parameter?.name, parameterName);
            assert.strictEqual(parameter?.type, 'some-type');
        });
    });

    describe('#expand()', () => {
        it('predicate name expands to include brackets', () => {
            // GIVEN
            const originalPddl = `(and (p ?p1 ?p2))`;
            const paramNode = new PddlSyntaxTreeBuilder(originalPddl).getTree().getNodeAt(originalPddl.indexOf('?p1') + 1);

            // WHEN
            const actual = paramNode.expand();

            // THEN
            assert.ok(actual);
            assert.strictEqual(actual?.getText(), '(p ?p1 ?p2)');
        });
    });

    describe('#isLeaveBracket()', () => {
        it('predicate is a leave bracket', () => {
            // GIVEN
            const originalPddl = `(define (p))`;
            const node = new PddlSyntaxTreeBuilder(originalPddl).getTree().getNodeAt(originalPddl.indexOf('(p)'));

            // WHEN
            const actual = node.isLeaveBracket();

            // THEN
            assert.strictEqual(actual, true, "(p) shall be a leave bracket node");
        });

        it('(not (p)) is a leave bracket', () => {
            // GIVEN
            const originalPddl = `(define (not (p)))`;
            const node = new PddlSyntaxTreeBuilder(originalPddl).getTree().getNodeAt(originalPddl.indexOf('(not') + 1);

            // WHEN
            const actual = node.isLeaveBracket();

            // THEN
            assert.strictEqual(actual, false, "(not (p)) shall NOT be a leave bracket node");
        });
    });
});