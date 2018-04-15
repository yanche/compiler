
export function* arrayIterator<T>(arr: ReadonlyArray<T>): Iterable<T> {
    yield* arr;
}

function* whereGenerator<T>(iter: Iterable<T>, predicate: (item: T, index: number) => boolean) {
    let i = 0;
    for (const item of iter) {
        if (predicate(item, i++)) {
            yield item;
        }
    }
}

export function where<T>(iter: Iterable<T>, predicate: (item: T, index: number) => boolean): Iterable<T> {
    return {
        [Symbol.iterator]: () => whereGenerator(iter, predicate)
    };
}

export function empty(iter: Iterable<any>): boolean {
    for (const item of iter) {
        return false;
    }
    return true;
}
