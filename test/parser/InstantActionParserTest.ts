/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as assert from 'assert';
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
            assert.ok(action, 'there should be an action parsed');
            assert.strictEqual(action.name, undefined);
            assert.strictEqual(action.parameters.length, 0);
            assert.strictEqual(action.preCondition, undefined);
            assert.strictEqual(action.effect, undefined);
            assert.ok(action.getDocumentation().join('\n').startsWith('can lift'));
            assert.deepStrictEqual(action.getLocation(), new PddlRange(2, 0, 2, 9));
        });

        it('extracts action with a name and a parameter', () => {
            // GIVEN
            const actionPddl = "(:action action1 :parameters (?p - type1))";

            // WHEN
            const action = createActionParser(actionPddl).getAction();

            // THEN
            assert.ok(action, 'there should be an action parsed');
            assert.strictEqual(action.name, 'action1');
            assert.strictEqual(action.parameters.length, 1, 'parameters');
            assert.deepStrictEqual(action.getLocation(), new PddlRange(0, 0, 0, 42));
        });

        it('extracts action with single predicate pre-condition', () => {
            // GIVEN
            const actionPddl = "(:action action1 :precondition(p))";

            // WHEN
            const action = createActionParser(actionPddl).getAction();

            // THEN
            assert.ok(action, 'there should be an action parsed');
            assert.strictEqual(action.name, 'action1');
            assert.strictEqual(action.preCondition?.getText(), '(p)');
            assert.deepStrictEqual(action.getLocation(), new PddlRange(0, 0, 0, 34));
        });

        it('extracts action with simple conjunction effect', () => {
            // GIVEN
            const actionPddl = "(:action action1 :effect(and (p))";

            // WHEN
            const action = createActionParser(actionPddl).getAction();

            // THEN
            assert.ok(action, 'there should be an action parsed');
            assert.strictEqual(action.name, 'action1');
            assert.strictEqual(action.effect?.getText(), '(and (p))');
        });
    });
});