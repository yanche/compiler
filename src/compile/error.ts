
export class CompileError {
    public toString(): string {
        return `error code: ${this.errCode}, error msg: ${this.errMsg}`;
    }

    constructor(public readonly errMsg: string, public readonly errCode: number) {
    }
}

export class LexError extends CompileError { }

export class SyntaxError extends CompileError { }

export class SemanticError extends CompileError { }
