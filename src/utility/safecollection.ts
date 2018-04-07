
export function createSelfInitMapOfArray<K, V>() {
    return new SelfInitMap<K, V[]>(() => []);
}

export function createSelfInitMapOfSet<K, V>() {
    return new SelfInitMap<K, Set<V>>(() => new Set<V>());
}

export function createSelfInitTableOfArray<ROW, COLUMN, VALUE>() {
    return new SelfInitTable<ROW, COLUMN, VALUE[]>(() => []);
}

export class SelfInitMap<K, V>{
    private _init: (key: K) => V;
    private _map: Map<K, V>;

    public get keys(): IterableIterator<K> {
        return this._map.keys();
    }

    public has(key: K): boolean {
        return this._map.has(key);
    }

    public get(key: K): V {
        if (!this._map.has(key)) {
            this._map.set(key, this._init(key));
        }
        return this._map.get(key)!;
    }

    public set(key: K, val: V): this {
        this._map.set(key, val);
        return this;
    }

    public get size(): number {
        return this._map.size;
    }

    constructor(initializer: (key: K) => V) {
        this._init = initializer;
        this._map = new Map<K, V>();
    }
}

export class SelfInitTable<ROW, COLUMN, VALUE>{
    // private _init: (row: ROW, column: COLUMN) => VALUE;
    private _map: SelfInitMap<ROW, SelfInitMap<COLUMN, VALUE>>;

    public getCell(row: ROW, column: COLUMN): VALUE {
        return this._map.get(row).get(column);
    }

    public setCell(row: ROW, column: COLUMN, value: VALUE): this {
        this._map.get(row).set(column, value);
        return this;
    }

    public hasCell(row: ROW, column: COLUMN): boolean {
        return this._map.has(row) && this._map.get(row).has(column);
    }

    constructor(initializer: (row: ROW, column: COLUMN) => VALUE) {
        // this._init = initializer;
        this._map = new SelfInitMap<ROW, SelfInitMap<COLUMN, VALUE>>(row => {
            return new SelfInitMap<COLUMN, VALUE>(column => {
                return initializer(row, column);
            });
        });
    }
}
