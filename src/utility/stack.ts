
export class Stack<T> {
    private _arr: T[];

    public pop(): T | undefined {
        return this._arr.pop();
    }

    public push(...items: T[]): this {
        this._arr.push(...items);
        return this;
    }

    public peek(index: number): T | undefined {
        return this._arr[index];
    }

    public get size(): number {
        return this._arr.length;
    }

    constructor(...items: T[]) {
        this._arr = [];

        if (items.length > 0) {
            this.push(...items);
        }
    }
}