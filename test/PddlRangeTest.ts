/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { expect } from 'chai';
import { PddlPosition, PddlRange } from './src';

describe('PddlPosition', () => {

    describe('#atOrBefore', () => {
        it('is at or before itself', () => {
            // GIVEN
            const first = new PddlPosition(1, 1);

            // WHEN
            const actual = first.atOrBefore(first);

            // THEN
            expect(actual, "should be atOrBefore itself").to.be.true;
        });

        it('on the same line', () => {
            // GIVEN
            const first = new PddlPosition(1, 1);
            const second = new PddlPosition(1, 10);

            // WHEN
            const firstBeforeSecond = first.atOrBefore(second);
            const secondBeforeFirst = second.atOrBefore(first);

            // THEN
            expect(firstBeforeSecond, "1 should be before 10").to.be.true;
            expect(secondBeforeFirst, "10 should NOT be before 1").to.be.false;
        });

        it('on the different lines', () => {
            // GIVEN
            const first = new PddlPosition(1, 10);
            const second = new PddlPosition(10, 1);

            // WHEN
            const firstBeforeSecond = first.atOrBefore(second);
            const secondBeforeFirst = second.atOrBefore(first);

            // THEN
            expect(firstBeforeSecond, "1.10 should be before 10.1").to.be.true ;
            expect(secondBeforeFirst, "10.1 should NOT be before 1.10").to.be.false;
        });
    });
});

describe('PddlRange', () => {

    describe('#includes', () => {
        it('is at or before itself', () => {
            // GIVEN
            const range1 = PddlRange.createRange({
                startLine: 1, startCharacter: 1,
                endLine: 1, endCharacter: 1
            });
            const position1 = new PddlPosition(1, 1);

            // WHEN
            const actual = range1.includes(position1);

            // THEN
            expect(actual, "range 1.1-1.1 should include position 1.1").to.be.true;
        });

        it('is outside range', () => {
            // GIVEN
            const range1 = PddlRange.createRange({
                startLine: 1, startCharacter: 1,
                endLine: 1, endCharacter: 1
            });
            const position1 = new PddlPosition(10, 10);

            // WHEN
            const actual = range1.includes(position1);

            // THEN
            expect(actual, "range 1.1-1.1 should NOT  include position 10.10").to.be.false;
        });
    });
});
