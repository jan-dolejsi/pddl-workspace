/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as atmp from './asynctmp';
import * as tmp from 'tmp';
import fs = require('fs');
import * as afs from './asyncfs';
import { URI } from 'vscode-uri';


export class Util {

    /**
     * Wraps path with doublequotes, if it includes a space.
     *
     * This is necessary on Windows in order to handle spaces in file and directory names.
     * @param path file system path
     */
    static q(path: string): string {
        return this.shouldBeDoubleQuoted(path) ? `"${path}"` : path;
    }

    static shouldBeDoubleQuoted(path: string): boolean {
        return path.includes(' ') && !path.includes('"')
            && !path.includes(" -jar ")
            && !path.includes(" -javaagent:")
            && !path.startsWith("node ");
    }

    static toFileSync(prefix: string, suffix: string, text: string): string {
        const tempFile = tmp.fileSync({ mode: 0o644, prefix: prefix + '-', postfix: suffix });
        fs.writeSync(tempFile.fd, text, 0, 'utf8');
        return tempFile.name;
    }

    static async toFile(prefix: string, suffix: string, text: string): Promise<string> {
        const tempFile = await atmp.file(0o644, prefix + '-', suffix);
        await afs.write(tempFile.fd, text, 0, 'utf8');
        return tempFile.path;
    }

    static toPddlFileSync(prefix: string, text: string): string {
        return Util.toFileSync(prefix, '.pddl', text);
    }

    static async toPddlFile(prefix: string, text: string): Promise<string> {
        return Util.toFile(prefix, '.pddl', text);
    }

    static fsPath(fileUri: string): string {
        return URI.parse(fileUri).fsPath;
    }

    /**
     * Replaces all occurrences
     * @param text text to replace in
     * @param searchValue value to replace
     * @param replaceValue replacement value
     */
    static replaceAll(text: string, searchValue: string, replaceValue: string): string {
        return text.split(searchValue).join(replaceValue);
    }

    /**
     * Groups array by a key
     * @param list list to be grouped
     * @param keyGetter grouping key selector
     */
    static groupBy<K, V>(list: Array<V>, keyGetter: (value: V) => K): Map<K, V[]> {
        const map = new Map();
        list.forEach((item) => {
            const key = keyGetter(item);
            const collection = map.get(key);
            if (!collection) {
                map.set(key, [item]);
            } else {
                collection.push(item);
            }
        });
        return map;
    }

    /**
     * Equivalent of flatMap from other languages.
     * @param arrayOfArrays array of arrays to be flattened to single dimentional array
     */
    static flatMap<T>(arrayOfArrays: Array<Array<T>>): Array<T> {
        // eslint-disable-next-line prefer-spread
        return new Array<T>().concat.apply(new Array<T>(), arrayOfArrays);
    }

    static distinct<T>(array: Array<T>): Array<T> {
        return [...new Set(array).values()];
    }
}

