/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as assert from 'assert';
import { PddlPosition, PddlRange } from './src';

describe('PddlPosition', () => {

    describe('#atOrBefore', () => {
        it('is at or before itself', () => {
            // GIVEN
            const first = new PddlPosition(1, 1);
            const expected = true;

            // WHEN
            const actual = first.atOrBefore(first);

            // THEN
            assert.strictEqual(actual, expected, "should be atOrBefore itself");
        });

        it('on the same line', () => {
            // GIVEN
            const first = new PddlPosition(1, 1);
            const second = new PddlPosition(1, 10);

            // WHEN
            const firstBeforeSecond = first.atOrBefore(second);
            const secondBeforeFirst = second.atOrBefore(first);

            // THEN
            assert.strictEqual(firstBeforeSecond, true, "1 should be before 10");
            assert.strictEqual(secondBeforeFirst, false, "10 should NOT be before 1");
        });

        it('on the different lines', () => {
            // GIVEN
            const first = new PddlPosition(1, 10);
            const second = new PddlPosition(10, 1);

            // WHEN
            const firstBeforeSecond = first.atOrBefore(second);
            const secondBeforeFirst = second.atOrBefore(first);

            // THEN
            assert.strictEqual(firstBeforeSecond, true, "1.10 should be before 10.1");
            assert.strictEqual(secondBeforeFirst, false, "10.1 should NOT be before 1.10");
        });
    });
});

describe('PddlRange', () => {

    describe('#includes', () => {
        it('is at or before itself', () => {
            // GIVEN
            const range1 = new PddlRange(1, 1, 1, 1);
            const position1 = new PddlPosition(1, 1);
            const expected = true;

            // WHEN
            const actual = range1.includes(position1);

            // THEN
            assert.strictEqual(actual, expected, "range 1.1-1.1 should include position 1.1");
        });

        it('is outside range', () => {
            // GIVEN
            const range1 = new PddlRange(1, 1, 1, 1);
            const position1 = new PddlPosition(10, 10);
            const expected = false;

            // WHEN
            const actual = range1.includes(position1);

            // THEN
            assert.strictEqual(actual, expected, "range 1.1-1.1 should NOT  include position 10.10");
        });
    });
});
