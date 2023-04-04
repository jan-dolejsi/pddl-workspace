/*
 * Copyright (c) Jan Dolejsi 2023. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 */
'use strict';

import assert from 'assert';
import { expect } from 'vitest';

import { PddlSyntaxTreeBuilder } from './src';
import { SimpleDocumentPositionResolver, DomainInfo } from '../src';
import { PddlDomainParser } from './src';
import { URI } from 'vscode-uri';


export function createPddlDomainParser(domainPddl: string): DomainInfo {
    const syntaxTree = new PddlSyntaxTreeBuilder(domainPddl).getTree();
    const domainNode = syntaxTree.getDefineNodeOrThrow().getFirstOpenBracketOrThrow('domain');
    const positionResolver = new SimpleDocumentPositionResolver(domainPddl);

    const domainInfo = new PddlDomainParser()
        .parse(URI.parse("file:///mock"), 1, domainPddl, domainNode, syntaxTree, positionResolver);
    if (domainInfo) {
        return domainInfo;
    } else {
        expect(domainInfo).to.not.be.undefined;
        throw new assert.AssertionError();
    }
}
