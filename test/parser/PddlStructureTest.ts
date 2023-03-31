/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as assert from 'assert';
import { describe, it, expect } from 'vitest';

import { PddlSyntaxTreeBuilder } from './src';
import { PddlStructure } from './src';
import { PddlTokenType } from './src';

describe('PddlStructure', () => {

    describe('#findPrecedingSection()', () => {

        it('finds (domain when asking for :functions', () => {
            // GIVEN
            const domainPddl = `(define (domain domain_name) (:action ))`;
            const tree = new PddlSyntaxTreeBuilder(domainPddl).getTree();
            const defineNode = tree.getDefineNode();

            // WHEN
            const actualDomainNode = PddlStructure.findPrecedingSection(PddlStructure.FUNCTIONS, defineNode, PddlStructure.PDDL_DOMAIN_SECTIONS);

            // THEN
            assert.notStrictEqual(actualDomainNode, undefined, 'there should be a (domain element');
            expect(actualDomainNode.getToken().tokenText).to.equal('(domain');
        });
        
        it('finds (domain when asking for a structure', () => {
            // GIVEN
            const domainPddl = `(define (domain domain_name) (:action ))`;
            const tree = new PddlSyntaxTreeBuilder(domainPddl).getTree();
            const defineNode = tree.getDefineNode();

            // WHEN
            const actualDomainNode = PddlStructure.findPrecedingSection(':action', defineNode, PddlStructure.PDDL_DOMAIN_SECTIONS);

            // THEN
            assert.notStrictEqual(actualDomainNode, undefined, 'there should be a (domain element');
            assert.strictEqual(actualDomainNode.getToken().tokenText, '(domain');
        });
    });

    describe('#getPrecedingSections()', () => {

        it('preceding of predicates', () => {
            // GIVEN
            // WHEN
            const precedingSections = PddlStructure.getPrecedingSections(PddlStructure.PREDICATES, PddlStructure.PDDL_DOMAIN_SECTIONS);

            // THEN
            assert.deepStrictEqual(precedingSections, ['domain', ':requirements', ':types', ':constants']);
        });

        it('preceding of domain', () => {
            // GIVEN
            // WHEN
            const precedingSections = PddlStructure.getPrecedingSections('domain', PddlStructure.PDDL_DOMAIN_SECTIONS);

            // THEN
            assert.deepStrictEqual(precedingSections, []);
        });
    });
    
    describe('#getFollowingSections()', () => {

        it('following of predicates', () => {
            // GIVEN
            // WHEN
            const followingSections = PddlStructure.getFollowingSections(PddlStructure.PREDICATES, PddlStructure.PDDL_DOMAIN_SECTIONS);

            // THEN
            assert.deepStrictEqual(followingSections, [':functions', ':constraints']);
        });

        it('following of :constraints', () => {
            // GIVEN
            // WHEN
            const followingSections = PddlStructure.getFollowingSections(':constraints', PddlStructure.PDDL_DOMAIN_SECTIONS);

            // THEN
            assert.deepStrictEqual(followingSections, []);
        });
    });

    describe('#getSupportedSectionsHere()', () => {

        it('suggests 0 supported in fully defined PDDL', () => {
            // GIVEN
            const domainPddlBefore = `(define (domain domain_name) (:predicates ) `;
            const domainPddlAfter = ` (:functions ) (:action ))`;
            const tree = new PddlSyntaxTreeBuilder(domainPddlBefore+domainPddlAfter).getTree();
            const currentNode = tree.getNodeAt(domainPddlBefore.length);

            // WHEN
            const supportedHere = PddlStructure.getSupportedSectionsHere(currentNode, currentNode, PddlTokenType.OpenBracketOperator, PddlStructure.PDDL_DOMAIN_SECTIONS, PddlStructure.PDDL_DOMAIN_STRUCTURES);

            // THEN
            assert.strictEqual(currentNode.getToken().type, PddlTokenType.Whitespace, 'should be inside whitespace');
            assert.deepStrictEqual(supportedHere, []);
        });

        it('suggests 2 supported', () => {
            // GIVEN
            const domainPddlBefore = `(define (domain domain_name) `;
            const domainPddlAfter = ` (:functions ) (:action ))`;
            const tree = new PddlSyntaxTreeBuilder(domainPddlBefore+domainPddlAfter).getTree();
            const currentNode = tree.getNodeAt(domainPddlBefore.length);

            // WHEN
            const supportedHere = PddlStructure.getSupportedSectionsHere(currentNode, currentNode, PddlTokenType.OpenBracketOperator, PddlStructure.PDDL_DOMAIN_SECTIONS, PddlStructure.PDDL_DOMAIN_STRUCTURES);

            // THEN
            assert.strictEqual(currentNode.getToken().type, PddlTokenType.Whitespace, 'should be inside whitespace');
            assert.deepStrictEqual(supportedHere, [':requirements', ':types', ':constants', ':predicates']);
        });

        it('suggests all structures', () => {
            // GIVEN
            const domainPddlBefore = `(define (domain domain_name) (:constraints ) `;
            const domainPddlAfter = ` (:action ))`;
            const tree = new PddlSyntaxTreeBuilder(domainPddlBefore+domainPddlAfter).getTree();
            const currentNode = tree.getNodeAt(domainPddlBefore.length);

            // WHEN
            const supportedHere = PddlStructure.getSupportedSectionsHere(currentNode, currentNode, PddlTokenType.OpenBracketOperator, PddlStructure.PDDL_DOMAIN_SECTIONS, PddlStructure.PDDL_DOMAIN_STRUCTURES);

            // THEN
            assert.strictEqual(currentNode.getToken().type, PddlTokenType.Whitespace, 'should be inside whitespace');
            assert.deepStrictEqual(supportedHere, PddlStructure.PDDL_DOMAIN_STRUCTURES);
        });

        it('suggests all structures and no sections', () => {
            // GIVEN
            const domainPddlBefore = `(define (domain domain_name) (:action ) `;
            const domainPddlAfter = ` )`;
            const tree = new PddlSyntaxTreeBuilder(domainPddlBefore+domainPddlAfter).getTree();
            const currentNode = tree.getNodeAt(domainPddlBefore.length);

            // WHEN
            const supportedHere = PddlStructure.getSupportedSectionsHere(currentNode, currentNode, PddlTokenType.OpenBracketOperator, PddlStructure.PDDL_DOMAIN_SECTIONS, PddlStructure.PDDL_DOMAIN_STRUCTURES);

            // THEN
            assert.strictEqual(currentNode.getToken().type, PddlTokenType.Whitespace, 'should be inside whitespace');
            assert.deepStrictEqual(supportedHere, PddlStructure.PDDL_DOMAIN_STRUCTURES);
        });

        /* ACTIONS */
        it('suggests 0 supported in fully defined action', () => {
            // GIVEN
            const domainPddlBefore = `(define (domain domain_name) (:action :parameters() :precondition(and ) `;
            const domainPddlAfter = ` :effect(and ) ))`;
            const tree = new PddlSyntaxTreeBuilder(domainPddlBefore+domainPddlAfter).getTree();
            const currentNode = tree.getNodeAt(domainPddlBefore.length);

            // WHEN
            const supportedHere = PddlStructure.getSupportedSectionsHere(PddlStructure.getPrecedingKeywordOrSelf(currentNode), currentNode, PddlTokenType.Keyword, PddlStructure.PDDL_ACTION_SECTIONS, []);

            // THEN
            assert.strictEqual(currentNode.getToken().type, PddlTokenType.Whitespace, 'should be inside whitespace');
            assert.deepStrictEqual(supportedHere, []);
        });

        it('suggests only :precondition', () => {
            // GIVEN
            const domainPddlBefore = `(define (domain domain_name) (:action :parameters() `;
            const domainPddlAfter = ` :effect(and ) ))`;
            const tree = new PddlSyntaxTreeBuilder(domainPddlBefore+domainPddlAfter).getTree();
            const currentNode = tree.getNodeAt(domainPddlBefore.length);

            // WHEN
            const supportedHere = PddlStructure.getSupportedSectionsHere(PddlStructure.getPrecedingKeywordOrSelf(currentNode), currentNode, PddlTokenType.Keyword, PddlStructure.PDDL_ACTION_SECTIONS, []);

            // THEN
            assert.strictEqual(currentNode.getToken().type, PddlTokenType.Whitespace, 'should be inside whitespace');
            assert.deepStrictEqual(supportedHere, [':precondition']);
        });

        it('suggests all action keywords', () => {
            // GIVEN
            const domainPddlBefore = `(define (domain domain_name) (:action `;
            const domainPddlAfter = ` ))`;
            const tree = new PddlSyntaxTreeBuilder(domainPddlBefore+domainPddlAfter).getTree();
            const currentNode = tree.getNodeAt(domainPddlBefore.length);

            // WHEN
            const supportedHere = PddlStructure.getSupportedSectionsHere(PddlStructure.getPrecedingKeywordOrSelf(currentNode), currentNode, PddlTokenType.Keyword, PddlStructure.PDDL_ACTION_SECTIONS, []);

            // THEN
            assert.strictEqual(currentNode.getToken().type, PddlTokenType.Whitespace, 'should be inside whitespace');
            assert.deepStrictEqual(supportedHere, [':parameters', ':precondition', ':effect']);
        });

        it('suggests only :parameters', () => {
            // GIVEN
            const domainPddlBefore = `(define (domain domain_name) (:action `;
            const domainPddlAfter = ` :precondition(and ) :effect(and ) ))`;
            const tree = new PddlSyntaxTreeBuilder(domainPddlBefore+domainPddlAfter).getTree();
            const currentNode = tree.getNodeAt(domainPddlBefore.length);

            // WHEN
            const supportedHere = PddlStructure.getSupportedSectionsHere(PddlStructure.getPrecedingKeywordOrSelf(currentNode), currentNode, PddlTokenType.Keyword, PddlStructure.PDDL_ACTION_SECTIONS, []);

            // THEN
            assert.strictEqual(currentNode.getToken().type, PddlTokenType.Whitespace, 'should be inside whitespace');
            assert.deepStrictEqual(supportedHere, [':parameters']);
        });
    });
});
