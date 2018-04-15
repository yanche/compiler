

export * from "./closure";
export * from "./collectionbuilder";
export * from "./stack";

export class IdGen {
    private _cur: number;

    constructor() {
        this._cur = 0;
    }

    public next(): number {
        return this._cur++;
    }

    public get cur(): number {
        return this._cur;
    }
}

export type NodeId = number;

export type Index = number;

export type SymbolId = number;

export type LR0ItemId = number;

export type LR1ItemId = number;

export type ProductionId = number;

export type StateId = number;

export type CharCode = number;

export interface Edge {
    src: NodeId;
    tgt: NodeId;
}

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

// export function flatten<T>(arr: ReadonlyArray<T | ReadonlyArray<T>>): Array<T>;
// export function flatten<T>(arr: Array<T | Array<T>>): Array<T>;
export function flatten<T>(arr: ConcatArray<T | ConcatArray<T>>): Array<T> {
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

export function* arrayIterator<T>(arr: ReadonlyArray<T>) {
    return yield* arr;
}
