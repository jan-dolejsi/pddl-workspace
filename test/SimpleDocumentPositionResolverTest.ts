/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as assert from 'assert';
import { describe, it, expect } from 'vitest';
import { SimpleDocumentPositionResolver, PddlPosition } from './src';

describe('SimpleDocumentPositionResolver', () => {

    describe('#resolveToPosition()', () => {
    
        it('single line text', () => {
            // GIVEN
            const documentText = 'text';
            const resolver = new SimpleDocumentPositionResolver(documentText);

            // WHEN
            const position0 = resolver.resolveToPosition(0);
            expect(position0).to.deep.equal(new PddlPosition(0, 0));
            expect(resolver.resolveToOffset(position0)).to.equal(0);

            const position1 = resolver.resolveToPosition(1);
            assert.deepStrictEqual(position1, new PddlPosition(0, 1));

            const position3 = resolver.resolveToPosition(3);
            assert.deepStrictEqual(position3, new PddlPosition(0, 3));

            const position4 = resolver.resolveToPosition(documentText.length);
            assert.deepStrictEqual(position4, new PddlPosition(0, documentText.length));
        });
        
        it('two line of text with linux EOL', () => {
            // GIVEN
            const line1 = 'line1';
            const documentText = line1 + '\nline2';
            const resolver = new SimpleDocumentPositionResolver(documentText);

            // WHEN
            const position0 = resolver.resolveToPosition(0);
            assert.deepStrictEqual(position0, new PddlPosition(0, 0));

            const position1 = resolver.resolveToPosition(line1.length + 1);
            expect(position1).to.deep.equal(new PddlPosition(1, 0));
            expect(resolver.resolveToOffset(position1)).to.equal(line1.length + 1);
        });
        
        it('two line of text with windows EOL', () => {
            // GIVEN
            const line1 = 'line1';
            const documentText = line1 + '\r\nline2';
            const resolver = new SimpleDocumentPositionResolver(documentText);

            // WHEN
            const position0 = resolver.resolveToPosition(0);
            assert.deepStrictEqual(position0, new PddlPosition(0, 0));

            const position1 = resolver.resolveToPosition(line1.length + 2);
            assert.deepStrictEqual(position1, new PddlPosition(1, 0));
        });
        
    });
    
});
