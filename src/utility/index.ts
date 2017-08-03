

import * as closure from "./closure";
import * as automata from "./automata";
import * as file from "./file";

export { closure, automata, file };

export function isNonNeg(num: number, int?: boolean): boolean {
    return num >= 0 && (!int || Math.ceil(num) === num);
}

export class BidirectMap<T> {
    private _nummap: Map<T, number>;
    private _tmap: Array<T>;
    private _idgen: IdGen;

    constructor() {
        this._nummap = new Map<T, number>();
        this._tmap = new Array<T>();
        this._idgen = new IdGen();
    }

    getOrCreateNum(input: T): number {
        if (this._nummap.has(input)) return this._nummap.get(input);
        else {
            let num = this._idgen.next();
            this._nummap.set(input, num);
            this._tmap.push(input);
            return num;
        }
    }

    getNum(input: T): number {
        return this._nummap.get(input);
    }

    getT(num: number): T {
        return this._tmap[num];
    }

    get size(): number {
        return this._nummap.size;
    }
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

export interface Edge {
    src: number;
    tgt: number;
}

function strictEqual(i1: any, i2: any): boolean { return i1 === i2; };
//time cost: O(n^2), if copy array and sort first, it could be O(nlogn)
export function arrayEquivalent<T1, T2>(arr1: Array<T1>, arr2: Array<T2>, comparefn?: (v1: T1, v2: T2) => boolean) {
    if (arr1.length !== arr2.length) return false;
    comparefn = comparefn || strictEqual;
    let len = arr1.length;
    let metarr = new Array(len);
    for (let i = 0; i < len; ++i) {
        let item1 = arr1[i], j = 0;
        for (; j < len; ++j) {
            if (metarr[j]) continue;
            let item2 = arr2[j];
            if (comparefn(item1, item2)) break;
        }
        if (j === len) return false; //not found
        metarr[j] = true;
    }
    return true;
};

// [start, end), step is 1
export function range(start: number, end?: number): Array<number> {
    if (end === undefined) {
        end = start;
        start = 0;
    }
    let ct = Math.max(0, end - start);
    let ret = new Array<number>(ct);
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
