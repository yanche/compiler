

export * from "./closure";
export * from "./collectionbuilder";
export * from "./stack";

export function isNonNeg(num: number, int?: boolean): boolean {
    return num >= 0 && (!int || Math.ceil(num) === num);
}

export class IdGen {
    private _cur: number;

    constructor() {
        this._cur = 0;
    }

    next(): number {
        return this._cur++;
    }

    get cur(): number {
        return this._cur;
    }
}

export type NodeId = number;

export type Index = number;

export interface Edge {
    src: NodeId;
    tgt: NodeId;
}

function strictEqual(i1: any, i2: any): boolean { return i1 === i2; };
//time cost: O(n^2), if copy array and sort first, it could be O(nlogn)
export function arrayEquivalent<T1, T2>(arr1: Array<T1>, arr2: Array<T2>, comparefn?: (v1: T1, v2: T2) => boolean) {
    if (arr1.length !== arr2.length) return false;
    comparefn = comparefn || strictEqual;
    const len = arr1.length;
    const metarr = new Array(len);
    for (let i = 0; i < len; ++i) {
        const item1 = arr1[i];
        let j = 0;
        for (; j < len; ++j) {
            if (metarr[j]) continue;
            const item2 = arr2[j];
            if (comparefn(item1, item2)) break;
        }
        if (j === len) return false; //not found
        metarr[j] = true;
    }
    return true;
};

// [start, end), step is 1t
export function range(start: number, end?: number): Array<number> {
    if (end === undefined) {
        end = start;
        start = 0;
    }
    const ct = Math.max(0, end - start);
    const ret = new Array<number>(ct);
    for (let i = 0; i < ct; ++i) {
        ret[i] = start + i;
    }
    return ret;
}

export function flatten<T>(arr: Array<T | Array<T>>): Array<T> {
    return Array.prototype.concat.apply([], arr);
}

export function startsWith(strbase: string, strpart: string): boolean {
    return strbase.slice(0, strpart.length) === strpart;
}

export function initArray<T>(len: number, init: T): Array<T> {
    const ret = new Array<T>(len);
    for (let i = 0; i < len; ++i) ret[i] = init;
    return ret;
}

export function findFirst<T>(arr: T[], predicate: (t: T, idx: number) => boolean): T | undefined;
export function findFirst<T>(arr: T[], predicate: (t: T, idx: number) => boolean, def: T): T;
export function findFirst<T>(arr: T[], predicate: (t: T, idx: number) => boolean, def?: T): T | undefined {
    const len = arr.length;
    for (let i = 0; i < len; ++i) {
        if (predicate(arr[i], i)) {
            return arr[i];
        }
    }
    return def;
}
