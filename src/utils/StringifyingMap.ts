/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi 2020. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

/**
 * Map that stringifies the key objects in order to leverage
 * the javascript native Map and preserve key uniqueness.
 */
export abstract class StringifyingMap<K, V> {
    private map = new Map<string, V>();
    private keyMap = new Map<string, K>();
    has(key: K): boolean {
        const keyString = this.stringifyKey(key);
        return this.map.has(keyString);
    }
    get(key: K): V | undefined {
        const keyString = this.stringifyKey(key);
        return this.map.get(keyString);
    }
    set(key: K, value: V): StringifyingMap<K, V> {
        const keyString = this.stringifyKey(key);
        this.map.set(keyString, value);
        this.keyMap.set(keyString, key);
        return this;
    }
    /**
     * Puts new key/value if key is absent.
     * @param key key
     * @param defaultValue default value factory
     */
    putIfAbsent(key: K, defaultValue: () => V): boolean {
        if (!this.has(key)) {
            const value = defaultValue();
            this.set(key, value);
            return true;
        }
        return false;
    }
    keys(): IterableIterator<K> {
        return this.keyMap.values();
    }
    keyList(): K[] {
        return [...this.keys()];
    }
    delete(key: K): boolean {
        const keyString = this.stringifyKey(key);
        const flag = this.map.delete(keyString);
        this.keyMap.delete(keyString);
        return flag;
    }
    clear(): void {
        this.map.clear();
        this.keyMap.clear();
    }
    size(): number {
        return this.map.size;
    }
    forEach(callbackfn: (value: V, key: string, map: Map<string, V>) => void, thisArg?: unknown): void {
        this.map.forEach(callbackfn, thisArg);
    }
    /**
     * Turns the `key` object to a primitive `string` for the underlying `Map`
     * @param key key to be stringified
     */
    protected abstract stringifyKey(key: K): string;
}
