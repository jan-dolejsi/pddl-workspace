/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as process from 'child_process';
import * as path from 'path';
import * as nunjucks from 'nunjucks';
import * as fs from 'fs';
import { ErrorWithMessage } from './utils';

export interface OutputAdaptor {
    appendLine(text: string): void;
    show(): void;
}

export class PreProcessingError implements Error {
    stack?: string;
    constructor(public readonly message: string, public readonly line: number, public readonly column: number) {
    }

    get name(): string {
        return 'pre-processing_error';
    }
}

export abstract class PreProcessor {
    constructor(protected metaDataLine?: string, public readonly metaDataLineOffset?: number) { }
    abstract transform(input: string, workingDirectory: string, outputWindow: OutputAdaptor): Promise<string>;
    abstract toString(): string;
    abstract getInputFiles(): string[];
    abstract getLabel(): string;

    protected removeMetaDataLine(text: string): string {
        const pattern = /^;;\s*!pre-parsing:/;

        return text.split('\n').map(line => pattern.test(line) ? "; Generated from a PDDL template and a data file" : line).join('\n');
    }
}

/**
 * Shell command based pre-processor.
 */
export class CommandPreProcessor extends PreProcessor {
    constructor(private command: string, protected args: string[], metaDataLine?: string, metaDataLineOffset?: number) {
        super(metaDataLine, metaDataLineOffset);
    }

    toString(): string {
        return `${this.command} ` + this.args.join(' ');
    }

    static fromJson(json: never): PreProcessor {
        return new CommandPreProcessor(json["command"], json["args"], '');
    }

    getInputFiles(): string[] {
        return [];
    }

    getLabel(): string {
        return this.command;
    }

    handleError(error: Error): void {
        throw new PreProcessingError(error.message, 0, 0);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handleErrorAsync(error: Error, reject: (message: any) => void): void {
        reject(new PreProcessingError(error.message, 0, 0));
    }

    async transform(input: string, workingDirectory: string, outputWindow: OutputAdaptor): Promise<string> {

        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const that = this;

        return new Promise<string>(function (resolve, reject) {
            const childProcess = process.execFile(that.command,
                that.args,
                {
                    cwd: workingDirectory
                },
                (error, stdout, stderr) => {

                    if (stderr) {
                        outputWindow.appendLine(stderr);
                    }

                    if (error) {
                        outputWindow.appendLine('Failed to transform the problem file.');
                        outputWindow.appendLine(error.message);
                        that.handleErrorAsync(error, reject);
                        resolve(input);
                    }
                    else {
                        resolve(that.removeMetaDataLine(stdout));
                        return;
                    }
                });
            childProcess.stdin?.write(input);
            childProcess.stdin?.end();

        });
    }
}

/**
 * Python-based pre-processor
 */
export class PythonPreProcessor extends CommandPreProcessor {
    constructor(pythonPath: string, script: string, args: string[], metaDataLine?: string, metaDataLineOffset?: number) {
        super(pythonPath, [script].concat(args), metaDataLine, metaDataLineOffset);
    }

    getInputFiles(): string[] {
        return this.args;
    }

    getLabel(): string {
        return this.args.join(' ');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    static fromJson(_json: never): PreProcessor {
        throw new Error("For Jinja2 pre-processor, use the constructor instead");
    }

    private static readonly JINJA2_TEMPLATE_SYNTAX_ERROR_PREFIX = 'jinja2.exceptions.TemplateSyntaxError: ';
    private static readonly PYTHON_JSON_DECODER = 'json.decoder.JSONDecodeError: ';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handleErrorAsync(error: Error, reject: (message: any) => void): void {
        const errorLines = error.message.split('\n');

        const templateSyntaxError = errorLines.find(row => row.startsWith(PythonPreProcessor.JINJA2_TEMPLATE_SYNTAX_ERROR_PREFIX));
        if (templateSyntaxError) {
            reject(new PreProcessingError(templateSyntaxError.substring(PythonPreProcessor.JINJA2_TEMPLATE_SYNTAX_ERROR_PREFIX.length), 0, 0));
            return;
        }

        const pythonJsonError = errorLines.find(row => row.startsWith(PythonPreProcessor.PYTHON_JSON_DECODER));
        if (pythonJsonError) {
            reject(new PreProcessingError('JSON Error: ' + pythonJsonError.substring(PythonPreProcessor.PYTHON_JSON_DECODER.length), 0, 0));
            return;
        }

        super.handleErrorAsync(error, reject);
    }
}

/**
 * Jinja2 pre-processor
 */
export class Jinja2PreProcessor extends PythonPreProcessor {
    constructor(pythonPath: string, extensionRoot: string, public dataFileName: string, metaDataLine?: string, metaDataLineOffset?: number) {
        super(pythonPath, path.join(extensionRoot, "scripts", "transform_jinja2.py"), [dataFileName], metaDataLine, metaDataLineOffset);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    static fromJson(_json: unknown): PreProcessor {
        throw new Error("For Jinja2 pre-processor, use the constructor instead");
    }

    getInputFiles(): string[] {
        return [this.dataFileName];
    }

    getLabel(): string {
        return this.dataFileName;
    }
}

/**
 * Nunjucks based pre-processor
 */
export class NunjucksPreProcessor extends PreProcessor {
    nunjucksEnv: nunjucks.Environment;

    constructor(public dataFileName: string, metaDataLine: string | undefined, metaDataLineOffset: number, preserveWhitespace: boolean) {
        super(metaDataLine, metaDataLineOffset);
        this.nunjucksEnv = nunjucks.configure({ trimBlocks: false, lstripBlocks: !preserveWhitespace, throwOnUndefined: true });
        this.nunjucksEnv.addFilter('map', function (array, attribute) {
            return array.map((item: never) => item[attribute]);
        });
        this.nunjucksEnv.addFilter('setAttribute', function (dictionary, key, value) {
            dictionary[key] = value;
            return dictionary;
        });
    }

    getInputFiles(): string[] {
        return [this.dataFileName];
    }

    getLabel(): string {
        return this.dataFileName;
    }

    toString(): string {
        return `Nunjucks ${this.dataFileName}`;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async transform(input: string, workingDirectory: string, _outputWindow: OutputAdaptor): Promise<string> {
        const dataPath = path.join(workingDirectory, this.dataFileName);
        const dataText = await fs.promises.readFile(dataPath);
        let data: unknown;

        try {
            data = JSON.parse(dataText.toLocaleString());
        } catch (error) {
            return `Failed to read from '${dataPath}'.`;
        }

        try {

            const translated = this.nunjucksEnv.renderString(input, { data: data });

            return this.removeMetaDataLine(translated);
        } catch (error: unknown) {
            const error1 = error as ErrorWithMessage;
            const pattern = /\((.+)\)\s+\[Line\s+(\d+),\s+Column\s+(\d+)\]/;
            const match = pattern.exec(error1.message);
            if (match) {
                throw new PreProcessingError(match[1], parseInt(match[2]) - 1, parseInt(match[3]) - 1);
            } else {
                throw new PreProcessingError(error1.message, 0, 0);
            }
        }
    }
}
