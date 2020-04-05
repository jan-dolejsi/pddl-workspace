/* eslint-disable @typescript-eslint/no-use-before-define */
/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as assert from 'assert';
import { expect } from 'chai';
import { URI } from 'vscode-uri';
import * as path from 'path';

import {
    PddlWorkspace, FileInfo, PddlLanguage, DocumentPositionResolver,
    SimpleDocumentPositionResolver, PddlWorkspaceExtension, DomainInfo, ProblemInfo,
    FileStatus
} from './src';
import { PddlFileParser, PddlSyntaxTree } from './parser/src';

describe('PddlWorkspace', () => {
    // var subject: PddlWorkspace;

    beforeEach(function () {
        // subject = new PddlWorkspace();
    });

    describe('#getFileName', () => {
        it('should handle tpddl schema and encoded encoded windows file name', () => {
            const uri = URI.file(path.join('c:', 'folder', 'file.txt')).with({ scheme: 'tpddl' }).toString();
            const fileName = PddlWorkspace.getFileName(uri);
            assert.equal(fileName, 'file.txt');
        });

        it('should handle file schema and encoded encoded windows file name', () => {
            const uri = URI.file(path.join('c:', 'folder', 'file.txt')).toString();
            const fileName = PddlWorkspace.getFileName(uri);
            assert.equal(fileName, 'file.txt');
        });
    });

    describe('#getFolderUri', () => {
        it('should handle tpddl schema and encoded windows file name', () => {
            const uri = URI.file(path.join('c:', 'folder', 'file.txt')).with({ scheme: 'tpddl' }).toString();
            const fileName = PddlWorkspace.getFolderPath(uri);
            assert.equal(fileName, path.join('c:', 'folder'));
        });

        it('should handle file schema and encoded windows file name', () => {
            const uri = URI.file(path.join('c:', 'folder', 'file.txt')).toString();
            const fileName = PddlWorkspace.getFolderPath(uri);
            assert.equal(fileName, path.join('c:', 'folder'));
        });

        it('should handle longer path with file schema and encoded windows file name', () => {
            const uri = URI.file(path.join('c:', 'folder', 'sub-folder', 'file.txt')).toString();
            const fileName = PddlWorkspace.getFolderPath(uri);
            assert.equal(fileName, path.join('c:', 'folder', 'sub-folder'));
        });
    });

    describe('#upsertFile', () => {
        it('parsed two files in the same folder', async () => {

            // GIVEN
            const pddlWorkspace = new PddlWorkspace(1e-3);
            const insertedFiles: FileInfo[] = [];
            pddlWorkspace.on(PddlWorkspace.INSERTED, (file: FileInfo) => {
                console.log(`Inserted: '${file.name}' from ${file.fileUri}.`);
                insertedFiles.push(file);
            })

            const pddlDomainText = `(define (domain domain_name) )`;
            const pddlProblemText = `(define (problem p1) (:domain domain_name))`;

            // WHEN
            const domainInfo = await pddlWorkspace.upsertFile(
                URI.file(path.join('folder1', 'domain.pddl')).toString(),
                PddlLanguage.PDDL,
                1, // content version
                pddlDomainText,
                new SimpleDocumentPositionResolver(pddlDomainText));

            const problemInfo = await pddlWorkspace.upsertFile(
                URI.file(path.join('folder1', 'problem.pddl')).toString(),
                PddlLanguage.PDDL,
                1, // content version
                pddlProblemText,
                new SimpleDocumentPositionResolver(pddlProblemText));

            const correspondingDomain = pddlWorkspace.getDomainFileFor(problemInfo as ProblemInfo);

            // now do something like `solve(correspondingDomain, problemInfo)`

            // THEN
            expect(domainInfo).be.instanceOf(DomainInfo);
            expect(problemInfo).be.instanceOf(ProblemInfo);
            expect(insertedFiles).to.have.lengthOf(2);
            expect(insertedFiles).to.deep.equal([domainInfo, problemInfo]);

            expect(correspondingDomain).to.equal(domainInfo, 'corresponding domain');
            const allFiles = pddlWorkspace.getAllFiles();
            expect(allFiles).to.deep.equal([domainInfo, problemInfo]);
        })
    })

    describe('#addPddlFileParser', () => {

        it('supports custom PDDL parsers', async () => {
            // GIVEN
            const pddlWorkspace = new PddlWorkspace(1e-3);
            pddlWorkspace.addExtension(new CustomExtension());
            const pddlText = `(:custom-pddl)`;

            // WHEN
            const actual = await pddlWorkspace.upsertFile('file:///test', PddlLanguage.PDDL, 1, pddlText, new SimpleDocumentPositionResolver(pddlText));

            // THEN
            expect(actual).be.instanceOf(CustomPddlFile);
        });
    });


    describe('#upsertAndParseFile', () => {

        it('parses file only once per version', async () => {
            // GIVEN
            const pddlWorkspace = new PddlWorkspace(1e-3);
            const parsed = new Array<[string, number]>();
            pddlWorkspace.addPddlFileParser([new CustomParser((file, version) => parsed.push([file, version]))]);
            const fileUri = 'file:///test';

            const v1 = 1;

            // WHEN
            {
                const pddlText1 = `(:custom-pddl)`;
                const update1a = await pddlWorkspace.upsertAndParseFile(fileUri, PddlLanguage.PDDL, v1, pddlText1, new SimpleDocumentPositionResolver(pddlText1));
                expect(parsed).to.deep.equal([[fileUri, v1]]);
                expect(update1a.getText()).to.equal(pddlText1);
                expect(update1a.syntaxTree.getRootNode().getText()).to.equal(pddlText1);
                expect(update1a.getStatus()).to.equal(FileStatus.Parsed);

                const update1b = await pddlWorkspace.upsertAndParseFile(fileUri, PddlLanguage.PDDL, v1, pddlText1, new SimpleDocumentPositionResolver(pddlText1));
                expect(parsed).to.deep.equal([[fileUri, v1]]);
                expect(update1b.getText()).to.equal(pddlText1);
                expect(update1b.syntaxTree.getRootNode().getText()).to.equal(pddlText1);
                expect(update1b.getStatus()).to.equal(FileStatus.Parsed);
            }
            {
                const pddlText2 = `(:custom-pddl :updated)`;
                const v2 = 2;
                const update2a = await pddlWorkspace.upsertAndParseFile(fileUri, PddlLanguage.PDDL, v2, pddlText2, new SimpleDocumentPositionResolver(pddlText2));
                expect(parsed).to.deep.equal([[fileUri, v1], [fileUri, v2]]);
                expect(update2a.getText()).to.equal(pddlText2);
                expect(update2a.syntaxTree.getRootNode().getText()).to.equal(pddlText2);
                expect(update2a.getStatus()).to.equal(FileStatus.Parsed);

                const update2b = await pddlWorkspace.upsertAndParseFile(fileUri, PddlLanguage.PDDL, v2, pddlText2, new SimpleDocumentPositionResolver(pddlText2));
                expect(parsed).to.deep.equal([[fileUri, v1], [fileUri, v2]]);
                expect(update2b.getText()).to.equal(pddlText2);
                expect(update2b.syntaxTree.getRootNode().getText()).to.equal(pddlText2);
                expect(update2b.getStatus()).to.equal(FileStatus.Parsed);
            }
        });
    });

});


class CustomPddlFile extends FileInfo {
    getLanguage(): PddlLanguage {
        return PddlLanguage.PDDL;
    }
}

class CustomParser extends PddlFileParser<CustomPddlFile> {
    constructor(private callback?: (fileUri: string, fileVersion: number) => void) {
        super();
    }
    async tryParse(fileUri: string, fileVersion: number, fileText: string, syntaxTree: PddlSyntaxTree, positionResolver: DocumentPositionResolver): Promise<CustomPddlFile | undefined> {
        this.callback && this.callback(fileUri, fileVersion);
        if ('(:custom-pddl') {
            const pddlFile = new CustomPddlFile(fileUri, fileVersion, 'custom', syntaxTree, positionResolver);
            pddlFile.setText(fileText);
            return pddlFile;
        }
    }
}

class CustomExtension extends PddlWorkspaceExtension {
    getPddlParsers(): PddlFileParser<FileInfo>[] | undefined {
        return [new CustomParser()];
    }
}
