
export function createMapBuilderOfArray<K, V>(): MapBuilder<K, V[]> {
    return new MapBuilder<K, V[]>(() => []);
}

export function createMapBuilderOfSet<K, V>(): MapBuilder<K, Set<V>> {
    return new MapBuilder<K, Set<V>>(() => new Set<V>());
}

export function createTableBuilderOfArray<ROW, COLUMN, VALUE>(): TableBuilder<ROW, COLUMN, VALUE[]> {
    return new TableBuilder<ROW, COLUMN, VALUE[]>(() => []);
}

export class MapBuilder<K, V>{
    private _init: (key: K) => V;
    private _map: Map<K, V>;
    private _completed: boolean;

    public get size(): number {
        return this._map.size;
    }

    public has(key: K): boolean {
        return this._map.has(key);
    }

    public get(key: K): V {
        if (!this._map.has(key)) {
            if (this._completed) {
                throw new Error(`failed to initialize with unset key after MapBuilder is completed: ${key}`);
            }
            this._map.set(key, this._init(key));
        }
        return this._map.get(key)!;
    }

    public set(key: K, val: V): this {
        if (this._completed) {
            throw new Error(`cannot set after MapBuilder is completed`);
        }
        this._map.set(key, val);
        return this;
    }

    public complete(): ReadonlyMap<K, V> {
        this._completed = true;
        return this._map;
    }

    constructor(initializer: (key: K) => V) {
        this._init = initializer;
        this._map = new Map<K, V>();
        this._completed = false;
    }
}

export interface Table<ROW, COLUMN, VALUE> {
    getCell(row: ROW, column: COLUMN): VALUE;
    hasCell(row: ROW, column: COLUMN): boolean;
}

export class TableBuilder<ROW, COLUMN, VALUE>{
    // private _init: (row: ROW, column: COLUMN) => VALUE;
    private _map: MapBuilder<ROW, MapBuilder<COLUMN, VALUE>>;

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

    public complete() {
        return new TableImpl<ROW, COLUMN, VALUE>(this._map);
    }

    constructor(initializer: (row: ROW, column: COLUMN) => VALUE) {
        // this._init = initializer;
        this._map = new MapBuilder<ROW, MapBuilder<COLUMN, VALUE>>(row => {
            return new MapBuilder<COLUMN, VALUE>(column => {
                return initializer(row, column);
            });
        });
    }
}

class TableImpl<ROW, COLUMN, VALUE> implements Table<ROW, COLUMN, VALUE> {
    private _map: MapBuilder<ROW, MapBuilder<COLUMN, VALUE>>;

    public getCell(row: ROW, column: COLUMN): VALUE {
        if (!this.hasCell(row, column)) {
            throw new Error(`cell not defined at: row-${row}, column-${column}`)
        }
        return this._map.get(row).get(column);
    }

    public hasCell(row: ROW, column: COLUMN): boolean {
        return this._map.has(row) && this._map.get(row).has(column);
    }

    constructor(map: MapBuilder<ROW, MapBuilder<COLUMN, VALUE>>) {
        this._map = map;
    }
}
