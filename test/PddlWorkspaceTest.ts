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
    PddlWorkspace, FileInfo, PddlLanguage, 
    SimpleDocumentPositionResolver, DomainInfo, ProblemInfo,
    FileStatus, PddlFileSystem, FileType, UnknownFileInfo
} from './src';
import { CustomPddlParserExtension, CustomParser, CustomPddlFile } from './CustomPddlParserExtension';
import { CustomPlannerProviderExtension, plannerKind as myPlannerKind, SolveServicePlannerProvider } from './planner/CustomPlannerProvider';

describe('PddlWorkspace', () => {
    // var subject: PddlWorkspace;

    beforeEach(function () {
        // subject = new PddlWorkspace();
    });

    describe('#getFileName', () => {
        it('should handle tpddl schema and encoded encoded windows file name', () => {
            const uri = URI.file(path.join('c:', 'folder', 'file.txt')).with({ scheme: 'tpddl' });
            const fileName = PddlWorkspace.getFileName(uri);
            assert.equal(fileName, 'file.txt');
        });

        it('should handle file schema and encoded encoded windows file name', () => {
            const uri = URI.file(path.join('c:', 'folder', 'file.txt'));
            const fileName = PddlWorkspace.getFileName(uri);
            assert.equal(fileName, 'file.txt');
        });
    });

    describe('#getFolderUri', () => {
        it('should handle tpddl schema and encoded windows file name', () => {
            const uri = URI.file(path.join('c:', 'folder', 'file.txt')).with({ scheme: 'tpddl' });
            const fileName = PddlWorkspace.getFolderPath(uri);
            assert.equal(fileName, path.join('c:', 'folder'));
        });

        it('should handle file schema and encoded windows file name', () => {
            const uri = URI.file(path.join('c:', 'folder', 'file.txt'));
            const fileName = PddlWorkspace.getFolderPath(uri);
            assert.equal(fileName, path.join('c:', 'folder'));
        });

        it('should handle longer path with file schema and encoded windows file name', () => {
            const uri = URI.file(path.join('c:', 'folder', 'sub-folder', 'file.txt'));
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
                URI.file(path.join('folder1', 'domain.pddl')),
                PddlLanguage.PDDL,
                1, // content version
                pddlDomainText,
                new SimpleDocumentPositionResolver(pddlDomainText));

            const problemInfo = await pddlWorkspace.upsertFile(
                URI.file(path.join('folder1', 'problem.pddl')),
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
        });

        it('loads other files from the same folder', (done) => {
    
            // GIVEN

            const domainFileName = 'domain.pddl';
            const problemFileName = 'problem.pddl';

            const pddlDomainText = `(define (domain domain_name) )`;
            const pddlProblemText = `(define (problem p1) (:domain domain_name))`;

            class MockPddlFileSystem implements PddlFileSystem {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                async readDirectory(_uri: URI): Promise<[string, FileType][]> {
                    return [
                        [domainFileName, FileType.File],
                        [problemFileName, FileType.File],
                        ["some irrelevant directory", FileType.Directory],
                        ["some irrelevant symbolic link", FileType.SymbolicLink],
                    ];
                }
                async readFile(uri: URI): Promise<Uint8Array> {
                    const fileName = path.basename(uri.fsPath);

                    switch (fileName) {
                        case domainFileName:
                            return new TextEncoder().encode(pddlDomainText);
                        default:
                            assert.fail(`Should not be reading file ${fileName}`);
                    }
                }
                
            }

            const pddlFileSystem = new MockPddlFileSystem();

            const pddlWorkspace = new PddlWorkspace(1e-3, undefined, pddlFileSystem);
            const insertedFiles: FileInfo[] = [];

            let problemInfo: ProblemInfo

            pddlWorkspace.on(PddlWorkspace.INSERTED, (file: FileInfo) => {
                console.log(`Inserted: '${file.name}' from ${file.fileUri}.`);
                insertedFiles.push(file);

                if (file.isProblem()) {
                    problemInfo = file as ProblemInfo;
                }

                if (file.isDomain()) {
                    const correspondingDomain = pddlWorkspace.getDomainFileFor(problemInfo);

                    const domainInfo = insertedFiles.find(fileInfo => fileInfo.isDomain());
                    
                    // THEN
                    expect(domainInfo).be.instanceOf(DomainInfo);
                    expect(insertedFiles).to.have.lengthOf(2);
        
                    expect(correspondingDomain).to.equal(domainInfo, 'corresponding domain');
                    const allFiles = pddlWorkspace.getAllFiles();
                    expect(allFiles).to.have.lengthOf(2);
                    done();
                }
            });

            pddlWorkspace.upsertFile(
                URI.file(path.join('folder1', problemFileName)),
                PddlLanguage.PDDL,
                1, // content version
                pddlProblemText,
                new SimpleDocumentPositionResolver(pddlProblemText));

        });

        it('loading 3 files from the same folder does not cause event storm', (done) => {
    
            // GIVEN

            const domainFileName = 'domain.pddl';
            const problem1FileName = 'problem1.pddl';
            const problem2FileName = 'problem2.pddl';

            const pddlDomainText = `(define (domain domain_name) )`;
            const pddlProblem1Text = `(define (problem p1) (:domain domain_name))`;
            const pddlProblem2Text = `(define (problem p2) (:domain domain_name))`;

            const filesRead: string[] = [];

            class MockPddlFileSystem implements PddlFileSystem {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                async readDirectory(_uri: URI): Promise<[string, FileType][]> {
                    return [
                        [domainFileName, FileType.File],
                        [problem1FileName, FileType.File],
                        [problem2FileName, FileType.File],
                        ["some irrelevant directory", FileType.Directory],
                        ["some irrelevant symbolic link", FileType.SymbolicLink],
                    ];
                }
                async readFile(uri: URI): Promise<Uint8Array> {
                    const fileName = path.basename(uri.fsPath);
                    console.log(`Loading file ${uri.fsPath}`);
                    if (filesRead.includes(fileName)) {
                        assert.fail(`Already read ${fileName}`);
                    }

                    filesRead.push(fileName);

                    switch (fileName) {
                        case domainFileName:
                            return new TextEncoder().encode(pddlDomainText);
                        case problem2FileName:
                            return new TextEncoder().encode(pddlProblem2Text);
                        default:
                            assert.fail(`Should not be reading file ${fileName} again`);
                    }
                }
                
            }

            const pddlFileSystem = new MockPddlFileSystem();

            const pddlWorkspace = new PddlWorkspace(1e-3, undefined, pddlFileSystem);
            const insertedFiles: FileInfo[] = [];

            let problemInfo: ProblemInfo

            pddlWorkspace.on(PddlWorkspace.INSERTED, (file: FileInfo) => {
                console.log(`Inserted: '${file.name}' from ${file.fileUri}.`);
                insertedFiles.push(file);

                if (file.isProblem() && !problemInfo) {
                    problemInfo = file as ProblemInfo;
                }

                if (file.isDomain()) {
                    const correspondingDomain = pddlWorkspace.getDomainFileFor(problemInfo);

                    const domainInfo = insertedFiles.find(fileInfo => fileInfo.isDomain());
                    
                    // THEN
                    expect(domainInfo).be.instanceOf(DomainInfo);
                    expect(insertedFiles).to.have.lengthOf(2);
        
                    expect(correspondingDomain).to.equal(domainInfo, 'corresponding domain');
                    const allFiles = pddlWorkspace.getAllFiles();
                    expect(allFiles).to.have.lengthOf(2);
                }

                // todo: should do something for the problem2?

                if (insertedFiles.length === 3) {
                    done();
                }
            });

            pddlWorkspace.upsertFile(
                URI.file(path.join('folder1', problem1FileName)),
                PddlLanguage.PDDL,
                1, // content version
                pddlProblem1Text,
                new SimpleDocumentPositionResolver(pddlProblem1Text));

        });
    });

    describe('#upsertAndParseFolder', () => {
        it('loads and parses 2 files in the folder', (done) => {
    
            // GIVEN

            const domainFileName = 'domain.pddl';
            const problem1FileName = 'problem1.pddl';

            const pddlDomainText = `(define (domain domain_name) )`;
            const pddlProblem1Text = `(define (problem p1) (:domain domain_name))`;

            const filesRead: string[] = [];

            class MockPddlFileSystem implements PddlFileSystem {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                async readDirectory(_uri: URI): Promise<[string, FileType][]> {
                    return [
                        [domainFileName, FileType.File],
                        [problem1FileName, FileType.File],
                        ["some irrelevant directory", FileType.Directory],
                        ["some irrelevant symbolic link", FileType.SymbolicLink],
                    ];
                }
                async readFile(uri: URI): Promise<Uint8Array> {
                    const fileName = path.basename(uri.fsPath);
                    console.log(`Loading file ${uri.fsPath}`);
                    if (filesRead.includes(fileName)) {
                        assert.fail(`Already read ${fileName}`);
                    }

                    filesRead.push(fileName);

                    switch (fileName) {
                        case domainFileName:
                            return new TextEncoder().encode(pddlDomainText);
                        case problem1FileName:
                            return new TextEncoder().encode(pddlProblem1Text);
                        default:
                            assert.fail(`File does not exist: ${fileName}`);
                    }
                }
                
            }

            const pddlFileSystem = new MockPddlFileSystem();

            const pddlWorkspace = new PddlWorkspace(1e-3, undefined, pddlFileSystem);
            const insertedFiles: FileInfo[] = [];

            pddlWorkspace.on(PddlWorkspace.INSERTED, (file: FileInfo) => {
                console.log(`Inserted: '${file.name}' from ${file.fileUri}.`);
                insertedFiles.push(file);

                if (insertedFiles.length === 2) {
                    done();
                }
            });

            pddlWorkspace.upsertAndParseFolder(URI.file('folder1'));
        });
    });

    describe('#addPddlFileParser', () => {

        it('supports custom PDDL parsers', async () => {
            // GIVEN
            const pddlWorkspace = new PddlWorkspace(1e-3);
            pddlWorkspace.addExtension(new CustomPddlParserExtension());
            const pddlText = `(:custom-pddl)`;

            // WHEN
            const actual = await pddlWorkspace.upsertFile(URI.parse('file:///test'), PddlLanguage.PDDL, 1, pddlText, new SimpleDocumentPositionResolver(pddlText));

            // THEN
            expect(actual).be.instanceOf(CustomPddlFile);
        });

        it('re-parses using the custom PDDL parsers', async () => {
            // GIVEN
            const pddlWorkspace = new PddlWorkspace(1e-3);
            const pddlText = `(:custom-pddl)`;
            const fileUri = URI.parse('file:///test');
            const unknownFile = await pddlWorkspace.upsertFile(fileUri, PddlLanguage.PDDL, 1, pddlText, new SimpleDocumentPositionResolver(pddlText));
            expect(unknownFile).be.instanceOf(UnknownFileInfo);

            // WHEN
            pddlWorkspace.addExtension(new CustomPddlParserExtension());

            const actualDirty = pddlWorkspace.getFileInfo(fileUri);
            if (!actualDirty) {
                assert.fail("file is not in the workspace?!");
            }
            expect(actualDirty.getStatus()).to.equal(FileStatus.Dirty, "file should be dirty");


            const actual = await pddlWorkspace.reParseFile(unknownFile);

            // THEN
            expect(actual).be.instanceOf(CustomPddlFile, "file should be re-parsed as 'custom'");
        });
    });


    describe('#upsertAndParseFile', () => {

        it('parses file only once per version', async () => {
            // GIVEN
            const pddlWorkspace = new PddlWorkspace(1e-3);
            const parsed = new Array<[URI, number]>();
            pddlWorkspace.addPddlFileParser([new CustomParser((file, version) => parsed.push([file, version]))]);
            const fileUri = URI.parse('file:///test');

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

    describe('#addExtension', () => {

        it('supports custom PDDL parsers', async () => {
            // GIVEN
            const pddlWorkspace = new PddlWorkspace(1e-3);
            const extension = new CustomPlannerProviderExtension();
            pddlWorkspace.addExtension(extension);

            // WHEN
            const actualProvider = pddlWorkspace.getPlannerRegistrar().getPlannerProvider(myPlannerKind);

            // THEN
            expect(actualProvider).be.instanceOf(SolveServicePlannerProvider);
            const plannerConfiguration = await actualProvider?.configurePlanner();
            expect(plannerConfiguration?.url).to.equal('http://solver.planning.domains/solve');
        });
    });
});
