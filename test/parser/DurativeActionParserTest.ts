/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { describe, it, expect } from 'vitest';
// eslint-disable-next-line @typescript-eslint/no-var-requires
import { PddlSyntaxTreeBuilder } from './src';
import { SimpleDocumentPositionResolver, PddlRange, DurativeAction } from '../src';
import { DurativeActionParser } from './src';

describe('DurativeActionParser', () => {

    function createActionParser(actionPddl: string): DurativeActionParser<DurativeAction> {
        const syntaxTree = new PddlSyntaxTreeBuilder(actionPddl).getTree();
        return new DurativeActionParser(
            syntaxTree.getRootNode().getFirstOpenBracketOrThrow(':durative-action'), 
            new SimpleDocumentPositionResolver(actionPddl));
    }

    describe('#getAction', () => {

        it('extracts one incomplete action', () => {
            // GIVEN
            const actionPddl = "\n; can lift crate from the surface\n(:durative-action)";

            // WHEN
            const action = createActionParser(actionPddl).getAction();

            // THEN
            expect(action, 'there should be an action parsed').to.not.be.undefined;
            expect(action.name).to.be.undefined;
            expect(action.parameters).to.have.length(0);
            expect(action.condition).to.be.undefined;
            expect(action.effect).to.be.undefined;
            expect(action.getDocumentation().join('\n')).to.startsWith('can lift');
            expect(action.getLocation()).to.deep.equal(PddlRange.createSingleLineRange({ line: 2, start: 0, end: 18 }));
        });

        it('extracts action with a name and a parameter', () => {
            // GIVEN
            const actionPddl = "(:durative-action action1 :parameters (?p - type1))";

            // WHEN
            const action = createActionParser(actionPddl).getAction();

            // THEN
            expect(action, 'there should be an action parsed').to.not.be.undefined;
            expect(action.name).to.equal('action1', 'action name');
            expect(action.parameters).to.have.length(1, 'parameters');
            expect(action.getLocation()).to.deep.equal(PddlRange.createSingleLineRange({ line: 0, start: 0, end: 51 }));
        });

        it('extracts action with a name and a duration', () => {
            // GIVEN
            const actionPddl = "(:durative-action action1 :duration (= ?duration 1))";

            // WHEN
            const action = createActionParser(actionPddl).getAction();

            // THEN
            expect(action, 'there should be an action parsed').to.not.be.undefined;
            expect(action.name).to.equal('action1', 'action name');
            expect(action.duration?.getText()).to.equal('(= ?duration 1)', 'duration');
        });

        it('extracts action with single predicate pre-condition', () => {
            // GIVEN
            const actionPddl = "(:durative-action action1 :condition (at start (p)))";

            // WHEN
            const action = createActionParser(actionPddl).getAction();

            // THEN
            expect(action, 'there should be an action parsed').to.not.be.undefined;
            expect(action.name).to.equal('action1', 'action name');
            expect(action.condition?.getText()).to.equal('(at start (p))');
        });

        it('extracts action with simple conjunction effect', () => {
            // GIVEN
            const actionPddl = "(:durative-action action1 :effect (and (at end (p)))";

            // WHEN
            const action = createActionParser(actionPddl).getAction();

            // THEN
            expect(action, 'there should be an action parsed').to.not.be.undefined;
            expect(action.name).to.equal('action1', 'action name');
            expect(action.effect?.getText()).to.equal('(and (at end (p)))');
        });

        it('parses action parameters with dashes', () => {
            // GIVEN
            const actionPddl = `(:durative-action DRIVE-TRUCK
                :parameters
                    (?truck - truck
                    ?loc-from - location
                    ?loc-to - location
                    ?driver - driver)
                :duration (= ?duration 10)
                :condition
                    (and (at start (at ?truck ?loc-from))
                    (over all (driving ?driver ?truck)) (at start (link ?loc-from ?loc-to)))
                :effect
                    (and (at start (not (at ?truck ?loc-from))) 
                    (at end (at ?truck ?loc-to))))
                `;

            // WHEN
            const action = createActionParser(actionPddl).getAction();

            // THEN
            expect(action, 'there should be an action parsed').to.not.be.undefined;
            expect(action.name).to.equal('DRIVE-TRUCK', 'action name');
            expect(action.parameters, 'parameters').to.have.length(4);
        })
    });
});