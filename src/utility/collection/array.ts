
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

export function initArray<T>(len: number, init: T): Array<T> {
    const ret = new Array<T>(len);
    for (let i = 0; i < len; ++i) ret[i] = init;
    return ret;
}

export function findFirst<T>(arr: Iterable<T>, predicate: (t: T, idx: number) => boolean): T | undefined;
export function findFirst<T>(arr: Iterable<T>, predicate: (t: T, idx: number) => boolean, def: T): T;
export function findFirst<T>(arr: Iterable<T>, predicate: (t: T, idx: number) => boolean, def?: T): T | undefined {
    let i = 0;
    for (const item of arr) {
        if (predicate(item, i)) {
            return item;
        }
    }
    return def;
}

export function* arrayIterator<T>(arr: ReadonlyArray<T>) {
    return yield* arr;
}
