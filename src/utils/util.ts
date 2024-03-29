/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as os from 'os';

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
        return os.platform() === 'win32' && path.includes(' ') && !path.includes('"')
            && !path.includes(" -jar ")
            && !path.includes(" -javaagent:")
            && !path.startsWith("node ");
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

/** @returns `true` if `text1` and `text2` are equal ignoring case. */
export function equalsCaseInsensitive(text1: string, text2: string): boolean {
    return text1.toLowerCase() === text2.toLowerCase();
}

export function addToMapOfSets<K, V>(multiMap: Map<K, Set<V>>, key: K, value: V): void {
    const valuesForKey = multiMap.get(key);
    if (valuesForKey) {
        valuesForKey.add(value);
    } else {
        multiMap.set(key, new Set<V>([value]));
    }
}

export function removeFromMapOfSets<K, V>(multiMap: Map<K, Set<V>>, key: K, value: V): boolean {
    const valuesForKey = multiMap.get(key);
    if (!valuesForKey) {
        return false;
    }
    valuesForKey.delete(value);
    if (valuesForKey.size == 0) {
        multiMap.delete(key);
    }
    return true;
}

export function addToMapOfLists<K, V>(multiMap: Map<K, V[]>, key: K, value: V): void {
    const valuesForKey = multiMap.get(key);
    if (valuesForKey) {
        valuesForKey.push(value);
    } else {
        multiMap.set(key, [value]);
    }
}

export function addAllToMapOfLists<K, V>(multiMap: Map<K, V[]>, key: K, values: V[]): void {
    const valuesForKey = multiMap.get(key);
    if (valuesForKey) {
        valuesForKey.push(...values);
    } else {
        multiMap.set(key, values);
    }
}

export function split<T>(collection: T[], predicate: (element: T) => boolean): [T[], T[]] {
    const positives: T[] = [];
    const negatives: T[] = [];

    collection.forEach(element => {
        if (predicate(element)) {
            positives.push(element);
        } else {
            negatives.push(element);
        }
    });

    return [positives, negatives];
}