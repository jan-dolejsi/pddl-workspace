/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { describe, it, expect } from 'vitest';
import { PddlSyntaxTreeBuilder } from './src';
import { SimpleDocumentPositionResolver, PddlRange } from '../src';
import { InstantActionParser } from './src';

describe('InstantActionParser', () => {

    function createActionParser(actionPddl: string): InstantActionParser {
        const syntaxTree = new PddlSyntaxTreeBuilder(actionPddl).getTree();
        return new InstantActionParser(
            syntaxTree.getRootNode().getFirstOpenBracketOrThrow(':action'), 
            new SimpleDocumentPositionResolver(actionPddl));
    }

    describe('#getAction', () => {

        it('extracts one incomplete action', () => {
            // GIVEN
            const actionPddl = "\n; can lift crate from the surface\n(:action)";

            // WHEN
            const action = createActionParser(actionPddl).getAction();

            // THEN
            expect(action, 'there should be an action parsed').to.not.be.undefined;
            expect(action.name).to.be.undefined;
            expect(action.parameters).to.have.length(0);
            expect(action.preCondition).to.be.undefined;
            expect(action.effect).to.be.undefined;
            expect(action.getDocumentation().join('\n')).to.startsWith('can lift');
            expect(action.getLocation()).to.deep.equal(PddlRange.createSingleLineRange({ line: 2, start: 0, end: 9 }));
        });

        it('extracts action with a name and a parameter', () => {
            // GIVEN
            const actionPddl = "(:action action1 :parameters (?p - type1))";

            // WHEN
            const action = createActionParser(actionPddl).getAction();

            // THEN
            expect(action, 'there should be an action parsed').to.not.be.undefined;
            expect(action.name).to.equal('action1', 'action name');
            expect(action.parameters).to.have.length(1, 'parameters');
            expect(action.getLocation()).to.deep.equal(PddlRange.createSingleLineRange({ line: 0, start: 0, end: 42 }));
        });

        it('extracts action with single predicate pre-condition', () => {
            // GIVEN
            const actionPddl = "(:action action1 :precondition(p))";

            // WHEN
            const action = createActionParser(actionPddl).getAction();

            // THEN
            expect(action, 'there should be an action parsed').to.not.be.undefined;
            expect(action.name).to.equal('action1', 'action name');
            expect(action.preCondition?.getText()).to.equal('(p)');
            expect(action.getLocation()).to.deep.equal(PddlRange.createSingleLineRange({ line: 0, start: 0, end: 34 }));
        });

        it('extracts action with simple conjunction effect', () => {
            // GIVEN
            const actionPddl = "(:action action1 :effect(and (p))";

            // WHEN
            const action = createActionParser(actionPddl).getAction();

            // THEN
            expect(action, 'there should be an action parsed').to.not.be.undefined;
            expect(action.name).to.equal('action1', 'action name');
            expect(action.effect?.getText()).to.equal('(and (p))');
        });
    });
});