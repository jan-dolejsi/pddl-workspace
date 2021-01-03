/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as fs from 'fs';
import * as path from 'path';

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
    const dirents = await fs.promises.readdir(dir, { withFileTypes: true });
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
    const stats = await fs.promises.stat(directory);
    if (!stats.isDirectory()) {
        throw new Error("Not a directory: " + directory);
    }

    const dirContent = await fs.promises.readdir(directory);
    return dirContent.length === 0;
}

export async function exists(path: fs.PathLike): Promise<boolean> {
    try {
        await fs.promises.stat(path);
    } catch (err) {
        if (err.code === 'ENOENT') {
            return false;
        } else {
            throw err;
        }
    }

    return true;
}