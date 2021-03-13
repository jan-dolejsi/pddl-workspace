/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as os from 'os';
import { expect } from 'chai';

import { Util } from '../../src/utils/index';

describe('Util', () => {

    describe('#q', () => {
        if (os.platform() === 'win32') {
            it('should not enclose a path without spaces', () => {
                const path = "c:\\folder\\tool.exe";
                expect(Util.q(path)).to.equal(path);
            });

            it('should enclose a path with spaces', () => {
                const path = "c:\\folder with space\\tool.exe";
                expect(Util.q(path)).to.equal('"' + path + '"');
            });

            it('should not enclose a path already enclosed', () => {
                const path = '"c:\\folder\\tool.exe"';
                expect(Util.q(path)).to.equal(path);
            });

            it('should not enclose a path with spaces already enclosed', () => {
                const path = '"c:\\folder with spaces\\tool.exe"';
                expect(Util.q(path)).to.equal(path);
            });
        }

        it('should not enclose java -jar path', () => {
            const path = 'java -jar asfdsdfasdfasd.jar';
            expect(Util.q(path)).to.equal(path);
        });

        it('should not enclose java -javaagent path', () => {
            const path = 'java -javaagent:d:/pddl4j/build/libs/pddl4j-3.8.3.jar -server -Xms2048m -Xmx2048m fr.uga.pddl4j.parser.Parser';
            expect(Util.q(path)).to.equal(path);
        });
    });
});
