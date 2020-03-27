/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { Parser } from './parser/parser';
import { ProblemInfo } from './ProblemInfo';
import { FileInfo, ParsingProblem, UnknownFileInfo } from './FileInfo';
import { HappeningsInfo } from "./HappeningsInfo";
import { Util } from './utils/util';
import { dirname, basename } from 'path';
import { PddlExtensionContext } from './PddlExtensionContext';
import { EventEmitter } from 'events';
import { PddlSyntaxTreeBuilder } from './parser/PddlSyntaxTreeBuilder';
import { DocumentPositionResolver } from './DocumentPositionResolver';
import { DomainInfo } from './DomainInfo';
import { URI } from 'vscode-uri';
import { PlanInfo } from './PlanInfo';
import { PddlPlanParser } from './parser/PddlPlanParser';
import { PddlLanguage, FileStatus } from './language';

function lowerCaseEquals(first: string, second: string): boolean {
    if (first === null || first === undefined) { return second === null || second === undefined; }
    else if (second === null || second === undefined) { return first === null || first === undefined; }
    else { return first.toLowerCase() === second.toLowerCase(); }
}

class Folder {
    files: Map<string, FileInfo> = new Map<string, FileInfo>();
    folderPath: string;

    constructor(folderPath: string) {
        this.folderPath = folderPath;
    }

    hasFile(fileUri: string): boolean {
        return this.files.has(fileUri);
    }

    get(fileUri: string): FileInfo | undefined {
        return this.files.get(fileUri);
    }

    add(fileInfo: FileInfo): void {
        if (URI.parse(fileInfo.fileUri).scheme !== "git") {
            this.files.set(fileInfo.fileUri, fileInfo);
        }
    }

    remove(fileInfo: FileInfo): boolean {
        return this.files.delete(fileInfo.fileUri);
    }

    removeByUri(fileUri: string): boolean {
        return this.files.delete(fileUri);
    }

    getProblemFileWithName(problemName: string): ProblemInfo | undefined {
        return Array.from(this.files.values())
            .filter(value => value.isProblem())
            .map(value => value as ProblemInfo)
            .find(problemInfo => lowerCaseEquals(problemInfo.name, problemName));
    }

    getProblemFilesFor(domainInfo: DomainInfo): ProblemInfo[] {
        return Array.from(this.files.values())
            .filter(value => value.isProblem())
            .map(f => f as ProblemInfo)
            .filter(problemInfo => lowerCaseEquals(problemInfo.domainName, domainInfo.name));
    }

    getDomainFilesFor(problemInfo: ProblemInfo): DomainInfo[] {
        return Array.from(this.files.values())
            .filter(value => value.isDomain())
            .map(value => value as DomainInfo)
            .filter(domainInfo => lowerCaseEquals(domainInfo.name, problemInfo.domainName));
    }
}

export class PddlWorkspace extends EventEmitter {
    public readonly folders: Map<string, Folder> = new Map<string, Folder>();
    public readonly parser: Parser;
    private parsingTimeout: NodeJS.Timer | undefined;
    private defaultTimerDelayInSeconds = 1;

    public static INSERTED = Symbol("INSERTED");
    public static UPDATED = Symbol("UPDATED");
    public static REMOVING = Symbol("REMOVING");

    constructor(public epsilon: number, context?: PddlExtensionContext) {
        super();
        this.parser = new Parser(context);
    }

    static getFolderPath(documentUri: string): string {
        const documentPath = Util.fsPath(documentUri);
        return dirname(documentPath);
    }

    static getFileName(documentUri: string): string {
        const documentPath = Util.fsPath(documentUri);
        return basename(documentPath);
    }

    static getFileInfoName(fileInfo: FileInfo): string {
        return this.getFileName(fileInfo.fileUri);
    }

    async upsertAndParseFile(fileUri: string, language: PddlLanguage, fileVersion: number, fileText: string, positionResolver: DocumentPositionResolver): Promise<FileInfo> {
        let fileInfo = await this.upsertFile(fileUri, language, fileVersion, fileText, positionResolver);
        if (fileInfo.getStatus() === FileStatus.Dirty) {
            fileInfo = await this.reParseFile(fileInfo);
        }

        return fileInfo;
    }

    async upsertFile(fileUri: string, language: PddlLanguage, fileVersion: number, fileText: string, positionResolver: DocumentPositionResolver, force = false): Promise<FileInfo> {

        const folderPath = PddlWorkspace.getFolderPath(fileUri);

        const folder = this.upsertFolder(folderPath);

        let fileInfo = folder.get(fileUri);
        if (fileInfo) {
            if (fileInfo.update(fileVersion, fileText, force)) {
                this.scheduleParsing();
            }
        }
        else {
            fileInfo = await this.insertFile(folder, fileUri, language, fileVersion, fileText, positionResolver);
        }

        return fileInfo;
    }

    private async insertFile(folder: Folder, fileUri: string, language: PddlLanguage, fileVersion: number, fileText: string, positionResolver: DocumentPositionResolver): Promise<FileInfo> {
        const fileInfo = await this.parseFile(fileUri, language, fileVersion, fileText, positionResolver);
        folder.add(fileInfo);

        if (fileInfo.isDomain()) {
            this.markProblemsAsDirty(fileInfo as DomainInfo);
        } else if (fileInfo.isProblem()) {
            this.markPlansAsDirty(fileInfo as ProblemInfo);
        }

        this.emitIfNew(PddlWorkspace.UPDATED, fileInfo);
        this.emitIfNew(PddlWorkspace.INSERTED, fileInfo);
        return fileInfo;
    }

    invalidateDiagnostics(fileInfo: FileInfo): void {
        fileInfo.setStatus(FileStatus.Parsed);
        this.emitIfNew(PddlWorkspace.UPDATED, fileInfo);
    }

    markProblemsAsDirty(domainInfo: DomainInfo): void {
        this.getProblemFiles(domainInfo).forEach(problemInfo => {
            this.invalidateDiagnostics(problemInfo);
            this.markPlansAsDirty(problemInfo);
        });
    }

    markPlansAsDirty(problemInfo: ProblemInfo): void {
        this.getPlanFiles(problemInfo).forEach(planInfo => this.invalidateDiagnostics(planInfo));
        this.getHappeningsFiles(problemInfo).forEach(happeningsInfo => this.invalidateDiagnostics(happeningsInfo));
    }

    scheduleParsing(): void {
        this.cancelScheduledParsing();
        this.parsingTimeout = setTimeout(() => this.parseAllDirty(), this.defaultTimerDelayInSeconds * 1000);
    }

    private cancelScheduledParsing(): void {
        if (this.parsingTimeout) { clearTimeout(this.parsingTimeout); }
    }

    private parseAllDirty(): void {
        // find all dirty files
        const dirtyFiles = this.getAllFilesIf(fileInfo => fileInfo.getStatus() === FileStatus.Dirty);

        dirtyFiles.forEach(file => this.reParseFile(file));
    }

    async reParseFile(fileInfo: FileInfo): Promise<FileInfo> {
        const folderPath = PddlWorkspace.getFolderPath(fileInfo.fileUri);
        const folder = this.upsertFolder(folderPath);

        folder.remove(fileInfo);
        fileInfo = await this.parseFile(fileInfo.fileUri, fileInfo.getLanguage(), fileInfo.getVersion(), fileInfo.getText(), fileInfo.getDocumentPositionResolver());
        folder.add(fileInfo);

        this.emitIfNew(PddlWorkspace.UPDATED, fileInfo);

        return fileInfo;
    }

    private lastVersionUpdateEmitted = new Map<string, number>();

    /**
     * Emit event, unless it is stale
     * @param fileInfo file concerned
     */
    private emitIfNew(symbol: symbol, fileInfo: FileInfo): void {
        if (symbol === PddlWorkspace.UPDATED) {
            const lastVersion = this.lastVersionUpdateEmitted.get(fileInfo.fileUri);
            if (lastVersion !== undefined && fileInfo.getVersion() <= lastVersion) {
                return;
            }
            else {
                this.lastVersionUpdateEmitted.set(fileInfo.fileUri, fileInfo.getVersion());
            }
        }
        this.emit(symbol, fileInfo);
    }
    private async parseFile(fileUri: string, language: PddlLanguage, fileVersion: number, fileText: string, positionResolver: DocumentPositionResolver): Promise<FileInfo> {
        if (language === PddlLanguage.PDDL) {
            const parser = new PddlSyntaxTreeBuilder(fileText);
            const syntaxTree = parser.getTree();
            const domainInfo = this.parser.tryDomain(fileUri, fileVersion, fileText, syntaxTree, positionResolver);

            if (domainInfo) {
                this.appendOffendingTokenToParsingProblems(domainInfo, parser, positionResolver);
                return domainInfo;
            } 

            const problemInfo = await this.parser.tryProblem(fileUri, fileVersion, fileText, syntaxTree, positionResolver);

            if (problemInfo) {
                this.appendOffendingTokenToParsingProblems(problemInfo, parser, positionResolver);
                return problemInfo;
            }

            const unknownFile = new UnknownFileInfo(fileUri, fileVersion, positionResolver);
            unknownFile.setText(fileText);
            return unknownFile;
        }
        else if (language === PddlLanguage.PLAN) {
            return PddlPlanParser.parseText(fileText, this.epsilon, fileUri, fileVersion, positionResolver);
        }
        else if (language === PddlLanguage.HAPPENINGS) {
            return this.parser.parseHappenings(fileUri, fileVersion, fileText, this.epsilon, positionResolver);
        }
        else {
            throw Error("Unknown language: " + language);
        }
    }

    private appendOffendingTokenToParsingProblems(fileInfo: FileInfo, parser: PddlSyntaxTreeBuilder, positionResolver: DocumentPositionResolver): void {
        fileInfo.addProblems(parser.getOffendingTokens().map(token => {
            const offendingPosition = positionResolver.resolveToPosition(token.getStart());
            return new ParsingProblem(`Unexpected token: ${token.toString()}`, offendingPosition.line, offendingPosition.character);
        }));
    }

    private upsertFolder(folderPath: string): Folder {
        let folder: Folder;

        if (!this.folders.has(folderPath)) {
            folder = new Folder(folderPath);
            this.folders.set(folderPath, folder);
        }
        else {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            folder = this.folders.get(folderPath)!;
        }

        return folder;
    }

    removeFile(documentUri: string, options: FileRemovalOptions): boolean {

        if (this.hasExplicitAssociations(documentUri)) {
            if (!options.removeAllReferences) { return false; }
        }
        // todo: remove the explicit associations
        const folderPath = PddlWorkspace.getFolderPath(documentUri);

        if (this.folders.has(folderPath)) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const folder = this.folders.get(folderPath)!;
            if (folder.hasFile(documentUri)) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const documentInfo = folder.get(documentUri)!;

                this.emitIfNew(PddlWorkspace.REMOVING, documentInfo);
                return folder.remove(documentInfo);
            }
        }

        return false;
    }

    hasExplicitAssociations(documentUri: string): boolean {
        return this.problemToDomainMap.has(documentUri) || [...this.problemToDomainMap.values()].includes(documentUri)
            || this.planToProblemMap.has(documentUri) || [...this.planToProblemMap.values()].includes(documentUri);
    }

    getFileInfo<T extends FileInfo>(fileUri: string): T | undefined {
        const folderPath = PddlWorkspace.getFolderPath(fileUri);

        if (this.folders.has(folderPath)) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const folder = this.folders.get(folderPath)!;
            const fileInfo = folder.get(fileUri);

            return fileInfo as T; // or null if the file did not exist in the folder
        }

        // folder does not exist
        return undefined;
    }

    getProblemFiles(domainInfo: DomainInfo): ProblemInfo[] {
        const folder = this.folders.get(PddlWorkspace.getFolderPath(domainInfo.fileUri));

        // find problem files in the same folder that match the domain name
        const problemFiles = folder?.getProblemFilesFor(domainInfo) ?? [];

        return problemFiles;
    }

    getPlanFiles(problemInfo: ProblemInfo): PlanInfo[] {
        const folder = this.folders.get(PddlWorkspace.getFolderPath(problemInfo.fileUri));
        if (folder === undefined) { return []; }

        // find plan files in the same folder that match the domain and problem names
        return Array.from(folder.files.values())
            .filter(f => f.isPlan())
            .map(f => f as PlanInfo)
            .filter(p => lowerCaseEquals(p.problemName, problemInfo.name)
                && lowerCaseEquals(p.domainName, problemInfo.domainName));
    }

    getHappeningsFiles(problemInfo: ProblemInfo): HappeningsInfo[] {
        const folder = this.folders.get(PddlWorkspace.getFolderPath(problemInfo.fileUri));
        if (folder === undefined) { return []; }

        // find happenings files in the same folder that match the domain and problem names
        return Array.from(folder.files.values())
            .filter(f => f.isHappenings())
            .map(f => f as HappeningsInfo)
            .filter(p => lowerCaseEquals(p.problemName, problemInfo.name)
                && lowerCaseEquals(p.domainName, problemInfo.domainName));
    }

    getAllFilesIf<T extends FileInfo>(predicate: (fileInfo: T) => boolean): T[] {
        const selectedFiles = new Array<FileInfo>();

        this.folders.forEach(folder => {
            folder.files.forEach((fileInfo) => {
                if (predicate.apply(this, [fileInfo as T])) { selectedFiles.push(fileInfo); }
            });
        });

        return selectedFiles as T[];
    }


    getAllFiles(): FileInfo[] {
        const selectedFiles = new Array<FileInfo>();

        this.folders.forEach(folder => {
            folder.files.forEach((fileInfo) => {
                selectedFiles.push(fileInfo);
            });
        });

        return selectedFiles;
    }

    /**
     * Finds a corresponding domain file
     * @param fileInfo a PDDL file info
     * @returns corresponding domain file if fileInfo is a problem file,
     * or `fileInfo` itself if the `fileInfo` is a domain file, or `null` otherwise.
     */
    asDomain(fileInfo: FileInfo): DomainInfo | undefined{
        if (fileInfo.isDomain()) {
            return fileInfo as DomainInfo;
        }
        else if (fileInfo.isProblem()) {
            return this.getDomainFileFor(fileInfo as ProblemInfo);
        }
        else if (fileInfo.isPlan()) {
            const problemFile1 = this.getProblemFileForPlan(fileInfo as PlanInfo);
            return problemFile1 && this.getDomainFileFor(problemFile1);
        }
        else if (fileInfo.isHappenings()) {
            const problemFile2 = this.getProblemFileForHappenings(fileInfo as HappeningsInfo);
            return problemFile2 && this.getDomainFileFor(problemFile2);
        }
        else {
            return undefined;
        }
    }

    /** Explicit associations between problem files and domain files. */
    private problemToDomainMap = new Map<string, string>();

    associateProblemToDomain(problemInfo: ProblemInfo, domainInfo: DomainInfo): void {
        this.problemToDomainMap.set(problemInfo.fileUri, domainInfo.fileUri);
    }

    /**
     * Finds the matching domain files.
     * @param problemFile problem file info
     * @returns matching domain files (zero, one or many)
     */
    getDomainFilesFor(problemFile: ProblemInfo): DomainInfo[] {
        // does an explicit association exist?
        if (this.problemToDomainMap.has(problemFile.fileUri)) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const domainFileUri = this.problemToDomainMap.get(problemFile.fileUri)!;
            const associatedDomain = this.getFileInfo<DomainInfo>(domainFileUri);
            return associatedDomain ? [associatedDomain] : [];
        }
        else {
            const folder = this.folders.get(PddlWorkspace.getFolderPath(problemFile.fileUri));

            if (!folder) { return []; }

            // find domain files in the same folder that match the problem's domain name
            const domainFiles = folder.getDomainFilesFor(problemFile);

            return domainFiles;
        }
    }

    /**
     * Finds the matching domain file in the same folder.
     * @param problemFile problem file info
     * @returns matching domain file, if exactly one exists in the same folder. `null` otherwise
     */
    getDomainFileFor(problemFile: ProblemInfo): DomainInfo | undefined {
        // find domain files in the same folder that match the problem's domain name
        const domainFiles = this.getDomainFilesFor(problemFile);

        return domainFiles.length === 1 ? domainFiles[0] : undefined;
    }

    /** Explicit associations between plan files and problem files. */
    private planToProblemMap = new Map<string, string>();

    associatePlanToProblem(planUri: string, problemFileInfo: ProblemInfo): void {
        this.planToProblemMap.set(planUri, problemFileInfo.fileUri);
    }

    getProblemFileForPlan(planInfo: PlanInfo): ProblemInfo | undefined {
        // does an explicit association exist?
        if (this.planToProblemMap.has(planInfo.fileUri)) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const problemFileUri = this.planToProblemMap.get(planInfo.fileUri)!;
            return this.getFileInfo<ProblemInfo>(problemFileUri);
        }
        else {
            const folder = this.getFolderOf(planInfo);
            if (!folder) { return undefined; }
            return folder.getProblemFileWithName(planInfo.problemName);
        }
    }

    getProblemFileForHappenings(happeningsInfo: HappeningsInfo): ProblemInfo | undefined {
        return this.getFolderOf(happeningsInfo)?.getProblemFileWithName(happeningsInfo.problemName);
    }

    getFolderOf(fileInfo: FileInfo): Folder | undefined {
        return this.folders.get(PddlWorkspace.getFolderPath(fileInfo.fileUri));
    }
}

export interface FileRemovalOptions {
    removeAllReferences: boolean;
}