/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as assert from 'assert';
import { PddlSyntaxTreeBuilder } from './src';
import { SimpleDocumentPositionResolver, PddlRange } from '../src';
import { DurativeActionParser } from './src';

describe('DurativeActionParser', () => {

    function createActionParser(actionPddl: string): DurativeActionParser {
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
            assert.ok(action, 'there should be an action parsed');
            assert.strictEqual(action.name, undefined);
            assert.strictEqual(action.parameters.length, 0);
            assert.strictEqual(action.condition, undefined);
            assert.strictEqual(action.effect, undefined);
            assert.ok(action.getDocumentation().join('\n').startsWith('can lift'));
            assert.deepStrictEqual(action.getLocation(), new PddlRange(2, 0, 2, 18));
        });

        it('extracts action with a name and a parameter', () => {
            // GIVEN
            const actionPddl = "(:durative-action action1 :parameters (?p - type1))";

            // WHEN
            const action = createActionParser(actionPddl).getAction();

            // THEN
            assert.ok(action, 'there should be an action parsed');
            assert.strictEqual(action.name, 'action1');
            assert.strictEqual(action.parameters.length, 1, 'parameters');
            assert.deepStrictEqual(action.getLocation(), new PddlRange(0, 0, 0, 51));
        });

        it('extracts action with a name and a duration', () => {
            // GIVEN
            const actionPddl = "(:durative-action action1 :duration (= ?duration 1))";

            // WHEN
            const action = createActionParser(actionPddl).getAction();

            // THEN
            assert.ok(action, 'there should be an action parsed');
            assert.strictEqual(action.name, 'action1', 'action name');
            assert.strictEqual(action.duration?.getText(), '(= ?duration 1)', 'duration');
        });

        it('extracts action with single predicate pre-condition', () => {
            // GIVEN
            const actionPddl = "(:durative-action action1 :condition (at start (p)))";

            // WHEN
            const action = createActionParser(actionPddl).getAction();

            // THEN
            assert.ok(action, 'there should be an action parsed');
            assert.strictEqual(action.name, 'action1');
            assert.strictEqual(action.condition?.getText(), '(at start (p))');
        });

        it('extracts action with simple conjunction effect', () => {
            // GIVEN
            const actionPddl = "(:durative-action action1 :effect (and (at end (p)))";

            // WHEN
            const action = createActionParser(actionPddl).getAction();

            // THEN
            assert.ok(action, 'there should be an action parsed');
            assert.strictEqual(action.name, 'action1');
            assert.strictEqual(action.effect?.getText(), '(and (at end (p)))');
        });
    });
});