/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as assert from 'assert';
import { expect } from 'chai';
import { PddlSyntaxTreeBuilder } from './src';
import { PddlTokenType } from './src';

describe('PddlSyntaxTreeBuilder', () => {

    describe('#getBreadcrumbs()', () => {

        it('parses empty document', () => {
            // GIVEN
            const domainPddl = '';

            // WHEN
            const breadcrumbs = new PddlSyntaxTreeBuilder(domainPddl).getBreadcrumbs(0);

            // THEN
            expect(breadcrumbs).to.have.length(1, 'there should be one - document tree node');
            const breadcrumb0 = breadcrumbs[0];
            assert.strictEqual(breadcrumb0.type, PddlTokenType.Document);
        });

        it('parses trivial whitespace', () => {
            // GIVEN
            const domainPddl = ` `;

            // WHEN
            const breadcrumbs = new PddlSyntaxTreeBuilder(domainPddl).getBreadcrumbs(1);

            // THEN
            expect(breadcrumbs).to.have.length(2, 'there should be one whitespace');
            const breadcrumb0 = breadcrumbs[1];
            assert.strictEqual(breadcrumb0.type, PddlTokenType.Whitespace);
        });

        it('parses comment', () => {
            // GIVEN
            const domainPddl = `; comment`;
 
            // WHEN
            const breadcrumbs = new PddlSyntaxTreeBuilder(domainPddl).getBreadcrumbs(1);

            // THEN
            expect(breadcrumbs).to.have.length(2, 'there should be one document and one comment');
            const breadcrumb0 = breadcrumbs[1];
            assert.strictEqual(breadcrumb0.type, PddlTokenType.Comment);
        });

        it('parses comment + whitespace', () => {
            // GIVEN
            const domainPddl = ';X\r\n';

            // WHEN
            const breadcrumbs = new PddlSyntaxTreeBuilder(domainPddl).getBreadcrumbs(3);

            // THEN
            expect(breadcrumbs).to.have.length(2, 'there should be one document and one whitespace');
            const breadcrumb0 = breadcrumbs[1];
            assert.strictEqual(breadcrumb0.type, PddlTokenType.Whitespace);
        });

        it('parses one open bracket', () => {
            // GIVEN
            const domainPddl = `(define`;

            // WHEN
            const breadcrumbs = new PddlSyntaxTreeBuilder(domainPddl).getBreadcrumbs(3);

            // THEN
            expect(breadcrumbs).to.have.length(2, 'there should be one document and one open bracket');
            const breadcrumb0 = breadcrumbs[1];
            assert.strictEqual(breadcrumb0.type, PddlTokenType.OpenBracketOperator);
            assert.strictEqual(breadcrumb0.tokenText, domainPddl);
        });

        it('parses one predicate', () => {
            // GIVEN
            const domainPddl = `(p)`;

            // WHEN
            const breadcrumbs = new PddlSyntaxTreeBuilder(domainPddl).getBreadcrumbs(domainPddl.length-1);

            // THEN
            expect(breadcrumbs).to.have.length(3, 'there should be # of breadcrumbs');
            const tokenTypes = breadcrumbs.map(f => f.type);
            assert.deepStrictEqual(tokenTypes, [
                PddlTokenType.Document,
                PddlTokenType.OpenBracket,
                PddlTokenType.Other,
            ]);
        });

        it('parses define domain', () => {
            // GIVEN
            const domainPddl = `(define (domain domain_name))`;

            // WHEN
            const position = 20;
            const breadcrumbs = new PddlSyntaxTreeBuilder(domainPddl).getBreadcrumbs(position);

            // THEN
            expect(breadcrumbs).to.have.length(4, 'there should be 4 nodes');
            const tokenTypes = breadcrumbs.map(f => f.type);
            assert.deepStrictEqual(tokenTypes, [
                PddlTokenType.Document,
                PddlTokenType.OpenBracketOperator,
                PddlTokenType.OpenBracketOperator,
                PddlTokenType.Other,
            ]);
            assert.strictEqual(breadcrumbs[1].tokenText, '(define');
            assert.strictEqual(breadcrumbs[2].tokenText, '(domain');
            assert.strictEqual(breadcrumbs[3].tokenText, 'domain_name');
        });

        it('parses requirements', () => {
            // GIVEN
            const domainPddl = `(:requirements :typing :fluents)`;

            // WHEN
            const position = 26;
            const breadcrumbs = new PddlSyntaxTreeBuilder(domainPddl).getBreadcrumbs(position);

            // THEN
            expect(breadcrumbs).to.have.length(3, 'there should be 3 nodes');
            const tokenTypes = breadcrumbs.map(f => f.type);
            assert.deepStrictEqual(tokenTypes, [
                PddlTokenType.Document,
                PddlTokenType.OpenBracketOperator,
                PddlTokenType.Keyword,
            ]);
            assert.strictEqual(breadcrumbs[1].tokenText, '(:requirements');
            assert.strictEqual(breadcrumbs[2].tokenText, ':fluents');
        });
    });


    describe('#getTree()', () => {

        it('parses empty document', () => {
            // GIVEN
            const domainPddl = '';

            // WHEN
            const tree = new PddlSyntaxTreeBuilder(domainPddl).getTree();

            // THEN
            expect(tree.getRootNode().getChildren()).to.have.length(0, 'there should be one 0 tree nodes');
            assert.strictEqual(tree.getNodeAt(0).getToken().type, PddlTokenType.Document);
        });

        it('parses trivial whitespace', () => {
            // GIVEN
            const domainPddl = ` `;

            // WHEN
            const tree = new PddlSyntaxTreeBuilder(domainPddl).getTree();

            // THEN
            assert.strictEqual(tree.getNodeAt(1).getToken().type, PddlTokenType.Whitespace, 'there should be one whitespace');
        });

        it('parses comment', () => {
            // GIVEN
            const domainPddl = `; comment`;
 
            // WHEN
            const tree = new PddlSyntaxTreeBuilder(domainPddl).getTree();

            // THEN
            assert.strictEqual(tree.getNodeAt(1).getToken().type, PddlTokenType.Comment, 'there should be one document and one comment');
        });

        it('parses comment + whitespace', () => {
            // GIVEN
            const domainPddl = ';X\r\n';

            // WHEN
            const tree = new PddlSyntaxTreeBuilder(domainPddl).getTree();

            // THEN
            expect(tree.getRootNode().getChildren()).to.have.length(2, 'there should be one comment and one whitespace');
            assert.deepStrictEqual(tree.getRootNode().getChildren().map(c => c.getToken().type), [
                PddlTokenType.Comment,
                PddlTokenType.Whitespace
            ]);

            assert.strictEqual(tree.getNodeAt(1).getToken().type, PddlTokenType.Comment);
            assert.strictEqual(tree.getNodeAt(3).getToken().type, PddlTokenType.Whitespace);
        });

        it('parses one open bracket', () => {
            // GIVEN
            const domainPddl = `(define`;

            // WHEN
            const tree = new PddlSyntaxTreeBuilder(domainPddl).getTree();

            // THEN
            expect(tree.getRootNode().getChildren()).to.have.length(1, 'there should be one open bracket');
            const node0 = tree.getNodeAt(1);
            assert.strictEqual(node0.getToken().type, PddlTokenType.OpenBracketOperator);
            assert.strictEqual(node0.getToken().tokenText, domainPddl);
        });

        it('parses one predicate', () => {
            // GIVEN
            const domainPddl = `(p)`;

            // WHEN
            const tree = new PddlSyntaxTreeBuilder(domainPddl).getTree();

            // THEN
            assert.strictEqual(tree.getNodeAt(2).getToken().type, PddlTokenType.Other);
            assert.strictEqual(tree.getRootNode().getSingleChild().getToken().type, PddlTokenType.OpenBracket);
            assert.strictEqual(tree.getRootNode().getSingleChild().getSingleChild().getToken().tokenText, 'p');
        });

        it('parses define domain', () => {
            // GIVEN
            const domainPddl = `(define (domain domain_name))`;

            // WHEN
            const position = 20;
            const tree = new PddlSyntaxTreeBuilder(domainPddl).getTree();

            // THEN
            assert.strictEqual(tree.getNodeAt(position).getToken().tokenText, 'domain_name');
            assert.strictEqual(tree.getRootNode().getSingleNonWhitespaceChild().getSingleNonWhitespaceChild().getSingleNonWhitespaceChild().getToken().tokenText, 'domain_name');
        });

        it('parses requirements', () => {
            // GIVEN
            const domainPddl = `(:requirements :typing :fluents)`;

            // WHEN
            const position = 6;
            const tree = new PddlSyntaxTreeBuilder(domainPddl).getTree();
            const reqs = tree.getNodeAt(position);

            // THEN
            expect(reqs.getNonWhitespaceChildren()).to.have.length(2, 'there should be 2 reqs');
            const tokenTypes = reqs.getNestedChildren().map(f => f.getToken().type);
            assert.deepStrictEqual(tokenTypes, [
                PddlTokenType.Whitespace,
                PddlTokenType.Keyword,
                PddlTokenType.Keyword,
            ]);

            assert.strictEqual(tree.getRootNode().getStart(), 0, 'requirements start');
            assert.strictEqual(tree.getRootNode().getEnd(), 32, 'requirements end');

            assert.strictEqual(reqs.getStart(), 0, 'requirements start');
            assert.strictEqual(reqs.getEnd(), 32, 'requirements end');

            assert.strictEqual(reqs.getChildren()[1].getToken().getStart(), 15, 'typing start');
            assert.strictEqual(reqs.getChildren()[1].getToken().getEnd(), 22, 'typing end');
            assert.strictEqual(reqs.getChildren()[1].getStart(), 15, 'typing start');
            assert.strictEqual(reqs.getChildren()[1].getEnd(), 23, 'typing end');
        });

        it('parses action', () => {
            // GIVEN
            const domainPddl = `(:action name
                :parameters (?p - t)
            )`;

            // WHEN
            const tree = new PddlSyntaxTreeBuilder(domainPddl).getTree();

            const action = tree.getRootNode().getSingleChild();
            assert.strictEqual(action.getToken().tokenText, '(:action');
            const actionName = action.getNonWhitespaceChildren()[0];
            assert.strictEqual(actionName.getToken().tokenText, 'name');
            const parameters = action.getChildren()[3];
            const parametersBracket = parameters.getSingleNonWhitespaceChild();
            const parametersChildren = parametersBracket.getNestedChildren().map(c => c.getToken().type);
            assert.deepStrictEqual(parametersChildren, [
                PddlTokenType.Parameter,
                PddlTokenType.Whitespace,
                PddlTokenType.Dash,
                PddlTokenType.Whitespace,
                PddlTokenType.Other,
            ]);
        });

        it('parses extra brackets', () => {
            // GIVEN
            const domainPddl = `(:action name
            )
            )`;

            // WHEN
            assert.doesNotThrow(() => new PddlSyntaxTreeBuilder(domainPddl).getTree());
        });

        it('parses closing bracket', () => {
            // GIVEN
            const domainPddl = `)`;

            // WHEN
            assert.doesNotThrow(() => new PddlSyntaxTreeBuilder(domainPddl).getTree());
        });
    });
});