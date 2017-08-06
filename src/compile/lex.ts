
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
    constructor(public rawstr: string, public symnum: number, public area: Area) { };
}

export class Posi {
    constructor(public row: number, public col: number) { }

    toString(): string {
        return `(row:${this.row},col:${this.col})`;
    }
}

export class Area {
    constructor(public start: Posi, public end: Posi) { }

    toString(): string {
        if (this.start.row === this.end.row) {
            if (this.start.col === this.end.col) return this.start.toString();
            else return `(row:${this.start.row},col:${this.start.col}-${this.end.col})`;
        }
        else return `(row:${this.start.row},col:${this.start.col}-row:${this.end.row},col:${this.end.col})`;
    }
}

export let noArea = new Area(new Posi(0, 0), new Posi(0, 0));
