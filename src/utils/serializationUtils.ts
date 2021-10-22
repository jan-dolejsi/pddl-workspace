/* --------------------------------------------------------------------------------------------
* Copyright (c) Jan Dolejsi 2020. All rights reserved.
* Licensed under the MIT License. See License.txt in the project root for license information.
* ------------------------------------------------------------------------------------------ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function asSerializable(obj: any): unknown {
    if (obj === undefined || obj === null) {
        return obj;
    }
    else if (obj instanceof Map) {
        return strMapToObj(obj);
    }
    else if (obj instanceof Array) {
        return obj.map(o => asSerializable(o));
    }
    else if (obj instanceof Set) {
        return [...obj].map(o => asSerializable(o));
    }
    else if (obj instanceof Object) {
        const serObj = Object.create(null);
        Object.keys(obj).forEach(key => serObj[key] = asSerializable(obj[key]));
        return serObj;
    }
    else {
        return obj;
    }
}

export function strMapToObj(strMap: Map<string, unknown>): unknown {
    const obj = Object.create(null);
    for (const [k, v] of strMap) {
        obj[k] = asSerializable(v);
    }
    return obj;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function objToStrMap(obj: any): Map<string, any> {
    const strMap = new Map();
    for (const k of Object.keys(obj)) {
        strMap.set(k, obj[k]);
    }
    return strMap;
}

/**
 * Removes circular dependencies to make JSON-serialization safe.
 * @param orig original object
 */
export function makeSerializable<T>(orig: T): T {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getCircularReplacer = (): any => {
        const seen = new WeakSet();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (_key: any, value: any): any => {
          if (typeof value === "object" && value !== null) {
            if (seen.has(value)) {
              return;
            }
            seen.add(value);
          }
          return value;
        };
      };
      
    return JSON.parse(JSON.stringify(orig, getCircularReplacer()));
}
