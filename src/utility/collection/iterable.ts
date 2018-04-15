
export function* arrayIterator<T>(arr: ReadonlyArray<T>): Iterable<T> {
    yield* arr;
}

export function where<T>(iter: Iterable<T>, predicate: (item: T, index: number) => boolean): Iterable<T> {
    return {
        [Symbol.iterator]: () => whereGenerator(iter, predicate)
    };
}

export function project<T, R>(iter: Iterable<T>, projectFn: (item: T, index: number) => R): Iterable<R> {
    return {
        [Symbol.iterator]: () => projectGenerator(iter, projectFn)
    };
}

export function empty(iter: Iterable<any>): boolean {
    for (const item of iter) {
        return false;
    }
    return true;
}

function* whereGenerator<T>(iter: Iterable<T>, predicate: (item: T, index: number) => boolean) {
    let i = 0;
    for (const item of iter) {
        if (predicate(item, i++)) {
            yield item;
        }
    }
}

function* projectGenerator<T, R>(iter: Iterable<T>, projectFn: (item: T, index: number) => R) {
    let i = 0;
    for (const item of iter) {
        yield projectFn(item, i++);
    }
}
