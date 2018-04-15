
import { LexError } from "./error";

export enum ErrorCode {
    INVALID_TOKEN = 100
}

export class InvalidTokenError extends LexError {
    constructor(tokenStr: string, position: Posi) {
        super(`invalid token: ${tokenStr}, at ${position}`, ErrorCode.INVALID_TOKEN);
    }
}

export class Token {
    constructor(public readonly rawstr: string, public readonly symId: number, public readonly area: Area) { };
}

export class Posi {
    constructor(public readonly row: number, public readonly col: number) { }

    public toString(): string {
        return `(row:${this.row},col:${this.col})`;
    }
}

export class Area {
    constructor(public readonly start: Posi, public readonly end: Posi) { }

    public toString(): string {
        if (this.start.row === this.end.row) {
            if (this.start.col === this.end.col) return this.start.toString();
            else return `(row:${this.start.row},col:${this.start.col}-${this.end.col})`;
        }
        else return `(row:${this.start.row},col:${this.start.col}-row:${this.end.row},col:${this.end.col})`;
    }
}

export const noArea = new Area(new Posi(0, 0), new Posi(0, 0));

export class LexIterator {
    private _iterator: IterableIterator<Token | LexError>;
    private _cur: IteratorResult<Token | LexError>;
    private _curval: Token | LexError | undefined;

    constructor(iterator: IterableIterator<Token | LexError>) {
        this._iterator = iterator;
        this._cur = iterator.next();
        this._curval = this._cur.value;
        if (this.done && !(this._curval instanceof LexError)) {
            throw new Error("lex error, empty return is not allowed, should at least return $");
        }
    }

    public get done(): boolean {
        // this._cur.done && this._cur.value === undefined
        // accept last statement is return value; instead of return;
        return (this._curval instanceof LexError) || (this._cur.done && this._cur.value === undefined);
    }

    public get cur(): Token | LexError {
        return this._curval!;
    }

    public next(): void {
        if (this.done) return;
        this._cur = this._iterator.next();
        const oldval = this._curval;
        if (this.done) {
            if ((oldval instanceof Token) && oldval.rawstr !== "$") {
                throw new Error(`lex error, last symbol should be $, checkout ${oldval.rawstr} at ${oldval.area}`);
            }
            return;
        }

        if (oldval instanceof Token) {
            if (oldval.rawstr === "$") {
                throw new Error(`lex error, no token should be present after $ at: ${oldval.area}, $ is the EOF symbol`);
            }
            this._curval = this._cur.value;
        }
    }
}
