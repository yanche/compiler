
import { isInt } from "../validate";

export class IdGen {
    private _cur: number;

    constructor(start: number = 0) {
        if (!isInt(start)) {
            throw new Error(`input to IdGen must be an integer`);
        }
        this._cur = start;
    }

    public next(): number {
        return this._cur++;
    }

    public get cur(): number {
        return this._cur;
    }
}
