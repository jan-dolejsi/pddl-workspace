/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as fs from 'fs';
import * as path from 'path';
import util = require('util');

export const readFile = util.promisify(fs.readFile);
export const writeFile = util.promisify(fs.writeFile);
export const write = util.promisify(fs.write);
export const exists = util.promisify(fs.exists);
export const readdir = util.promisify(fs.readdir);
export const unlink = util.promisify(fs.unlink);
export const rmdir = util.promisify(fs.rmdir);
export const stat = util.promisify(fs.stat);
export const copyFile = util.promisify(fs.copyFile);

/**
 * Creates directory (optionally recursively) 
 * @param path path for the directory to create
 * @param options `fs.mkdir` options
 */
export async function mkdirIfDoesNotExist(path: fs.PathLike, options: fs.MakeDirectoryOptions | undefined | null | number | string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        fs.mkdir(path, options, err => {
            if (err && err.code !== 'EEXIST') {
                reject(err);
            }
            else {
                resolve();
            }
        });
    });
}

/**
 * All files in the this and its sub-directories.
 * @param dir starting directory
 * @returns file name array with absolute path
 */
export async function getFiles(dir: string): Promise<string[]> {
    const dirents = await readdir(dir, { withFileTypes: true });
    const childrenFilePromises = dirents.map(dirent => {
        const res = path.resolve(dir, dirent.name);
        return dirent.isDirectory() ? getFiles(res) : Promise.resolve([res]);
    });
    const files = await Promise.all(childrenFilePromises);
    return Array.prototype.concat(...files);
}

/**
 * Determines whether the directory is empty i.e. contains any files or sub-directories.
 * @param directory directory to test
 */
export async function isEmpty(directory: string): Promise<boolean> {
    const stats = await stat(directory);
    if (!stats.isDirectory()) {
        throw new Error("Not a directory: " + directory);
    }

    const dirContent = await readdir(directory);
    return dirContent.length === 0;
}