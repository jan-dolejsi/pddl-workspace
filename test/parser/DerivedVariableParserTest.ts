/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { PddlSyntaxTreeBuilder } from './src';
import { SimpleDocumentPositionResolver, PddlRange } from '../src';
import { DerivedVariablesParser } from './src';

import { describe, it } from 'vitest';
import { expect, use } from 'chai';
// eslint-disable-next-line @typescript-eslint/no-var-requires
use(require('chai-string'));
use(function(_chai,utils) {
    utils.objDisplay = function(obj: unknown): string { return obj+''; };
});

describe('DerivedVariableParser', () => {
    describe('#getVariable', () => {

        it('extracts one derived predicate', () => {
            // GIVEN
            const derivedPredicatePddl = `
            ; can lift crate from the surface
            (:derived (can-lift ?c - crate ?s - surface) 
               (and (clear ?c) (on ?c ?s)))
            `;
            const syntaxTree = new PddlSyntaxTreeBuilder(derivedPredicatePddl).getTree();

            // WHEN
            const parser = new DerivedVariablesParser(
                syntaxTree.getRootNode().getFirstOpenBracketOrThrow(':derived'), 
                new SimpleDocumentPositionResolver(derivedPredicatePddl));
            const derivedPredicate = parser.getVariable();

            // THEN
            expect(derivedPredicate, 'there should be one derived predicate').to.not.be.undefined;
            expect(derivedPredicate?.name).equal('can-lift');
            expect(derivedPredicate?.parameters).to.have.length(2);
            expect(derivedPredicate?.getDocumentation().join('\n')).to.startWith('can lift');
            expect(derivedPredicate?.getLocation()).to.deep.equal(PddlRange.createRange({ startLine: 2, startCharacter: 12, endLine: 3, endCharacter: 43 }));
        });

        it('parses derived function', () => {
            // GIVEN
            const derivedFunctionPddl = `        (:derived (c) (+ (a) (b))`;
            const syntaxTree = new PddlSyntaxTreeBuilder(derivedFunctionPddl).getTree();

            // WHEN
            const parser = new DerivedVariablesParser(
                syntaxTree.getRootNode().getFirstOpenBracketOrThrow(':derived'), 
                new SimpleDocumentPositionResolver(derivedFunctionPddl));
            const derivedFunction = parser.getVariable();

            // THEN
            expect(derivedFunction, 'there should be one derived function').to.not.be.undefined;
            expect(derivedFunction?.name).to.equal('c');
            expect(derivedFunction?.parameters).to.have.length(0);
            expect(derivedFunction?.getLocation()).to.deep.equal(PddlRange.createSingleLineRange({ line: 0, start: 8, end: 33 }));
        });
    });
});