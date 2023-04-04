/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { URI } from 'vscode-uri';
import { EventEmitter } from 'events';
import { dirname, basename, extname, join } from 'path';

import { HappeningsParser } from './parser/HappeningsParser';
import { ProblemInfo } from './ProblemInfo';
import { FileInfo, ParsingProblem, UnknownFileInfo } from './FileInfo';
import { HappeningsInfo } from "./HappeningsInfo";
import { PddlExtensionContext } from './PddlExtensionContext';
import { PddlSyntaxTreeBuilder } from './parser/PddlSyntaxTreeBuilder';
import { DocumentPositionResolver, PddlRange, SimpleDocumentPositionResolver } from './DocumentPositionResolver';
import { DomainInfo } from './DomainInfo';
import { PlanInfo } from './PlanInfo';
import { PddlPlanParser } from './parser/PddlPlanParser';
import { PddlLanguage, FileStatus, PDDL, toLanguageFromId } from './language';
import { PddlFileParser, PddlDomainParser, PddlProblemParser, PddlParserOptions } from './parser/index';
import { PddlWorkspaceExtension } from './PddlWorkspaceExtension';
import { PlannerRegistrar } from './planner/PlannerRegistrar';

function lowerCaseEquals(first: string, second: string): boolean {
    if (first === null || first === undefined) { return second === null || second === undefined; }
    else if (second === null || second === undefined) { return first === null || first === undefined; }
    else { return first.toLowerCase() === second.toLowerCase(); }
}

export class Folder {
    files: Map<string, FileInfo> = new Map<string, FileInfo>();
    private readonly folderUri: URI;

    constructor(public readonly folderPath: string) {
        this.folderUri = URI.file(this.folderPath);
    }

    getFolderUri(): URI {
        return this.folderUri;
    }

    hasFile(fileUri: URI): boolean {
        return this.files.has(fileUri.toString());
    }

    get(fileUri: URI): FileInfo | undefined {
        return this.files.get(fileUri.toString());
    }

    add(fileInfo: FileInfo): void {
        if (fileInfo.fileUri.scheme !== "git") {
            this.files.set(fileInfo.fileUri.toString(), fileInfo);
        }
    }

    remove(fileInfo: FileInfo): boolean {
        return this.files.delete(fileInfo.fileUri.toString());
    }

    removeByUri(fileUri: URI): boolean {
        return this.files.delete(fileUri.toString());
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

/**
 * Enumeration of file types. The types `File` and `Directory` can also be
 * a symbolic links, in that case use `FileType.File | FileType.SymbolicLink` and
 * `FileType.Directory | FileType.SymbolicLink`.
 */
export enum FileType {
    /**
     * The file type is unknown.
     */
    Unknown = 0,
    /**
     * A regular file.
     */
    File = 1,
    /**
     * A directory.
     */
    Directory = 2,
    /**
     * A symbolic link to a file.
     */
    SymbolicLink = 64
}

export interface PddlFileSystem {
    
    /**
     * Retrieve all entries of a [directory](#FileType.Directory).
     *
     * @param uri The uri of the folder.
     * @return An array of name/type-tuples or a thenable that resolves to such.
     */
    readDirectory(uri: URI): Promise<[string, FileType][]>;

    /**
     * Read the entire contents of a file.
     *
     * @param uri The uri of the file.
     * @return An array of bytes or a thenable that resolves to such.
     */
    readFile(uri: URI): Promise<Uint8Array>;
}

interface FileNameTypeUri {
    fileName: string;
    fileType: FileType;
    fileUri: URI;
}

function toFileNameTypeUri(folderUri: URI, file: [string, FileType]): FileNameTypeUri {
    return {
        fileName: file[0],
        fileType: file[1],
        fileUri: URI.file(join(folderUri.fsPath, file[0])),
    };
}

export interface PddlWorkspaceOptions {
    epsilon: number;
    context?: PddlExtensionContext;
    parserOptions?: PddlParserOptions;
    fileLoader?: PddlFileSystem;
}

export class PddlWorkspace extends EventEmitter {
    public readonly folders: Map<string, Folder> = new Map<string, Folder>();
    private parsingTimeout: NodeJS.Timer | undefined;
    private defaultTimerDelayInSeconds = 1;
    private pddlFileParsers: PddlFileParser<FileInfo>[];
    private plannerRegistrar: PlannerRegistrar;
    private _epsilon: number;
    private readonly fileLoader?: PddlFileSystem;

    public static INSERTED = Symbol("INSERTED");
    public static UPDATED = Symbol("UPDATED");
    public static REMOVING = Symbol("REMOVING");
    static MAX_FILES_PER_FOLDER = 30;

    constructor(options: PddlWorkspaceOptions) {
        super();
        this._epsilon = options.epsilon;
        this.fileLoader = options.fileLoader;
        this.pddlFileParsers = [new PddlDomainParser(), new PddlProblemParser(options.context)];
        this.plannerRegistrar = new PlannerRegistrar();
    }

    get epsilon(): number {
        return this._epsilon;
    }

    set epsilon(value: number) {
        this._epsilon = value;
    }

    getPlannerRegistrar(): PlannerRegistrar {
        return this.plannerRegistrar;
    }

    addExtension(extension: PddlWorkspaceExtension): void {
        if (extension.getPddlParsers) {
            const parsers = extension.getPddlParsers();
            if (parsers) {
                this.addPddlFileParser(parsers);
            }
        }

        if (extension.getPlannerProvider) {
            const plannerProviders =  extension.getPlannerProvider();
            if (plannerProviders) {
                plannerProviders
                    .forEach(provider =>
                        this.plannerRegistrar.registerPlannerProvider(provider.kind, provider));
            }
        }
    }

    addPddlFileParser(parsers: PddlFileParser<FileInfo>[]): void {
        this.pddlFileParsers.unshift(...parsers);
        if (parsers.length > 0) {
            this.getAllFilesIf(fi => fi.getLanguage() === PddlLanguage.PDDL)
                .forEach(fi => this.invalidateDiagnostics(fi, FileStatus.Dirty));
            
            this.scheduleParsing();
        }
    }

    static getFolderPath(documentUri: URI): string {
        const documentPath = documentUri.fsPath;
        return dirname(documentPath);
    }

    static getFileName(documentUri: URI): string {
        const documentPath = documentUri.fsPath;
        return basename(documentPath);
    }

    static getFileInfoName(fileInfo: FileInfo): string {
        return this.getFileName(fileInfo.fileUri);
    }

    async upsertAndParseFile(fileUri: URI, language: PddlLanguage, fileVersion: number, fileText: string, positionResolver: DocumentPositionResolver): Promise<FileInfo> {
        let fileInfo = await this.upsertFile(fileUri, language, fileVersion, fileText, positionResolver);
        if (fileInfo.getStatus() === FileStatus.Dirty) {
            fileInfo = await this.reParseFile(fileInfo);
        }

        return fileInfo;
    }

    async upsertFile(fileUri: URI, language: PddlLanguage, fileVersion: number, fileText: string, positionResolver: DocumentPositionResolver, force = false): Promise<FileInfo> {

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
            // ensure the other files in the folder are up to date too
            this.loadFolder(folder);
        }

        return fileInfo;
    }

    private async insertFile(folder: Folder, fileUri: URI, language: PddlLanguage, fileVersion: number, fileText: string, positionResolver: DocumentPositionResolver): Promise<FileInfo> {
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

    private async loadFolder(folder: Folder): Promise<void> {
        const folderUri = folder.getFolderUri();

        if (this.fileLoader) {
            // parse eagerly all (up to a max) PDDL files in the folder that have not been parsed already
            const files = await this.fileLoader.readDirectory(folderUri);
            const filePromises = files
                .map(file => toFileNameTypeUri(folderUri, file))
                .filter(file => file.fileType === FileType.File
                    && extname(file.fileName).toLowerCase() === '.' + PDDL
                    // avoid parsing the same file again
                    && !folder.hasFile(file.fileUri)
                    // stop at a maximum to avoid freezing the UI in huge folders
                    && folder.files.size < PddlWorkspace.MAX_FILES_PER_FOLDER)
                .map(async (file) => {
                    const fileContent = new TextDecoder("utf-8").decode(await this.fileLoader?.readFile(file.fileUri));
                    return fileContent && this.insertFile(folder, file.fileUri, toLanguageFromId(PDDL) ?? PddlLanguage.PDDL, -1, fileContent, new SimpleDocumentPositionResolver(fileContent));
                });
            Promise.all(filePromises);
        }
    }

    invalidateDiagnostics(fileInfo: FileInfo, fileStatus?: FileStatus): void {
        fileInfo.setStatus(fileStatus ?? FileStatus.Parsed);
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
        if (this.parsingTimeout) { clearTimeout(this.parsingTimeout); } // todo: use .refresh()
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
            const lastVersion = this.lastVersionUpdateEmitted.get(fileInfo.fileUri.toString());
            if (lastVersion !== undefined && fileInfo.getVersion() <= lastVersion) {
                return;
            }
            else {
                this.lastVersionUpdateEmitted.set(fileInfo.fileUri.toString(), fileInfo.getVersion());
            }
        }
        this.emit(symbol, fileInfo);
    }

    private async parseFile(fileUri: URI, language: PddlLanguage, fileVersion: number, fileText: string, positionResolver: DocumentPositionResolver): Promise<FileInfo> {
        if (language === PddlLanguage.PDDL) {
            const parser = new PddlSyntaxTreeBuilder(fileText);
            const syntaxTree = parser.getTree();

            for (const pddlParser of this.pddlFileParsers) {
                const pddlFile = await pddlParser.tryParse(fileUri, fileVersion, fileText, syntaxTree, positionResolver);
                if (pddlFile) {
                    this.appendOffendingTokenToParsingProblems(pddlFile, parser, positionResolver);
                    return pddlFile;
                }
            }

            const unknownFile = new UnknownFileInfo(fileUri, fileVersion, positionResolver);
            unknownFile.setText(fileText);
            return unknownFile;
        }
        else if (language === PddlLanguage.PLAN) {
            return new PddlPlanParser().parseText(fileText, this.epsilon, fileUri, fileVersion, positionResolver);
        }
        else if (language === PddlLanguage.HAPPENINGS) {
            return new HappeningsParser().parseHappenings(fileUri, fileVersion, fileText, this.epsilon, positionResolver);
        }
        else {
            throw Error("Unknown language: " + language);
        }
    }

    private appendOffendingTokenToParsingProblems(fileInfo: FileInfo, parser: PddlSyntaxTreeBuilder, positionResolver: DocumentPositionResolver): void {
        fileInfo.addProblems(parser.getOffendingTokens().map(token => {
            const offendingPosition = positionResolver.resolveToPosition(token.getStart());
            return new ParsingProblem(`Unexpected token: ${token.toString()}`, "error", PddlRange.createSingleCharacterRange({ line: offendingPosition.line, character: offendingPosition.character }));
        }));
    }

    async upsertAndParseFolder(folderUri: URI): Promise<Folder> {
        const folderPath = folderUri.fsPath;
        const folder = this.folders.get(folderPath);
        if (folder) { return folder; }

        const newFolder = new Folder(folderPath);
        this.folders.set(folderPath, newFolder);
        this.loadFolder(newFolder)
        return newFolder;
    }

    getFolder(folderUri: URI): Folder | undefined {
        return this.folders.get(folderUri.fsPath);
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

    removeFile(documentUri: URI, options: FileRemovalOptions): boolean {

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

    hasExplicitAssociations(documentUri: URI): boolean {
        return this.problemToDomainMap.has(documentUri.toString()) || [...this.problemToDomainMap.values()].includes(documentUri.toString())
            || this.planToProblemMap.has(documentUri.toString()) || [...this.planToProblemMap.values()].includes(documentUri.toString());
    }

    getFileInfo<T extends FileInfo>(fileUri: URI): T | undefined {
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
    asDomain(fileInfo: FileInfo): DomainInfo | undefined {
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
        this.problemToDomainMap.set(problemInfo.fileUri.toString(), domainInfo.fileUri.toString());
    }

    /**
     * Finds the matching domain files.
     * @param problemFile problem file info
     * @returns matching domain files (zero, one or many)
     */
    getDomainFilesFor(problemFile: ProblemInfo): DomainInfo[] {
        const key = problemFile.fileUri.toString();
        // does an explicit association exist?
        if (this.problemToDomainMap.has(key)) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const domainFileUri = URI.parse(this.problemToDomainMap.get(key)!);
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

    associatePlanToProblem(planUri: URI, problemFileInfo: ProblemInfo): void {
        this.planToProblemMap.set(planUri.toString(), problemFileInfo.fileUri.toString());
    }

    getProblemFileForPlan(planInfo: PlanInfo): ProblemInfo | undefined {
        const key = planInfo.fileUri.toString();
        // does an explicit association exist?
        if (this.planToProblemMap.has(key)) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const problemFileUri = URI.parse(this.planToProblemMap.get(key)!);
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