
import { ParseTreeMidNode } from "./parse";
import { CompileError, SemanticError } from "./error";

export abstract class StageReturn {
    protected _error?: CompileError;

    constructor(error?: CompileError) {
        this._error = error;
    }

    public get accept(): boolean { return !this._error; }

    public get error(): CompileError | undefined { return this._error; }
}

export class CompileReturn extends StageReturn { }

export class ParseReturn extends StageReturn {
    private _root?: ParseTreeMidNode;

    constructor(root?: ParseTreeMidNode, error?: CompileError) {
        super(error);
        if ((Number(!!error) ^ Number(!!root)) !== 1) {
            throw new Error("you must provide either error or root");
        }
        this._root = root;
    }

    public get root(): ParseTreeMidNode | undefined { return this._root; }
}

// export class LexReturn extends StageReturn<LexError> {
//     private _tokens?: Token[];

//     constructor(tokens?: Token[], error?: LexError) {
//         super(error);
//         if ((Number(!!error) ^ Number(!!tokens)) !== 1) {
//             throw new Error("you must provide either error or tokens");
//         }
//         this._tokens = tokens;
//     }

//     public get tokens(): Token[] | undefined { return this._tokens; }
// }

export abstract class SemanticCheckReturn extends StageReturn {
    constructor(error?: SemanticError) {
        super(error);
    }
}
