/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as assert from 'assert';

import { Util } from '../../src/utils/index';

describe('Util', () => {

    describe('#q', () => {
        it('should not enclose a path wihtout spaces', () => {
            const path = "c:\\folder\\tool.exe";
            assert.equal(Util.q(path), path);
        });

        it('should enclose a path wiht spaces', () => {
            const path = "c:\\folder with space\\tool.exe";
            assert.equal(Util.q(path), '"' + path + '"');
        });

        it('should not enclose a path already enclosed', () => {
            const path = '"c:\\folder\\tool.exe"';
            assert.equal(Util.q(path), path);
        });

        it('should not enclose a path with spaces already enclosed', () => {
            const path = '"c:\\folder with spaces\\tool.exe"';
            assert.equal(Util.q(path), path);
        });

        it('should not enclose java -jar path', () => {
            const path = 'java -jar asfdsdfasdfasd.jar';
            assert.equal(Util.q(path), path);
        });

        it('should not enclose java -javaagent path', () => {
            const path = 'java -javaagent:d:/pddl4j/build/libs/pddl4j-3.8.3.jar -server -Xms2048m -Xmx2048m fr.uga.pddl4j.parser.Parser';
            assert.equal(Util.q(path), path);
        });
    });
});
