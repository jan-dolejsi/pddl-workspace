/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { describe, it, expect } from 'vitest';

import { PddlSyntaxTreeBuilder } from './src';

describe('PddlSyntaxTree', () => {

    describe('#getDefineNode()', () => {

        it('gets define node', () => {
            // GIVEN
            const domainPddl = `(define (domain domain_name))`;
            const tree = new PddlSyntaxTreeBuilder(domainPddl).getTree();

            // WHEN
            const defineNode = tree.getDefineNode();

            // THEN
            expect(defineNode, 'there should be a (define element').to.not.be.undefined;
        });
    });
});
