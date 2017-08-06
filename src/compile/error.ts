
export class CompileError {
    protected _errmsg: string;
    protected _errcode: number;

    get errMsg(): string {
        return this._errmsg;
    }

    get errCode(): number {
        return this._errcode;
    }

    toString(): string {
        return `error code: ${this._errcode}, error msg: ${this._errmsg}`;
    }

    constructor(errmsg: string, errcode: number) {
        this._errmsg = errmsg;
        this._errcode = errcode;
    }
}

export class LexError extends CompileError { }

export class SyntaxError extends CompileError { }

export class SemanticError extends CompileError { }
