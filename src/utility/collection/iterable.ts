
export function* arrayIterator<T>(arr: ReadonlyArray<T>): Iterable<T> {
    yield* arr;
}

export function* where<T>(iter: Iterable<T>, predicate: (item: T, index: number) => boolean): Iterable<T> {
    let i = 0;
    for (const item of iter) {
        if (predicate(item, i++)) {
            yield item;
        }
    }
}
