/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

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

