
import { ParseTreeMidNode } from "./parse";
import { Token } from "./lex";
import { CompileError, SyntaxError, LexError, SemanticError } from "./error";

export abstract class StageReturn<T extends CompileError> {
    protected _error?: T;

    constructor(error?: T) {
        this._error = error;
    }

    get accept(): boolean { return !this._error; }

    get error(): T | undefined { return this._error; }
}

export class CompileReturn extends StageReturn<CompileError> { }

export class ParseReturn extends StageReturn<SyntaxError> {
    private _root?: ParseTreeMidNode;

    constructor(root?: ParseTreeMidNode, error?: SyntaxError) {
        super(error);
        if ((Number(!!error) ^ Number(!!root)) !== 1) {
            throw new Error("you must provide either error or root");
        }
        this._root = root;
    }

    get root(): ParseTreeMidNode | undefined { return this._root; }
}

export class LexReturn extends StageReturn<LexError> {
    private _tokens?: Token[];

    constructor(tokens?: Token[], error?: LexError) {
        super(error);
        if ((Number(!!error) ^ Number(!!tokens)) !== 1) {
            throw new Error("you must provide either error or tokens");
        }
        this._tokens = tokens;
    }

    get tokens(): Token[] | undefined { return this._tokens; }
}

export abstract class SemanticCheckReturn extends StageReturn<SemanticError> {
    constructor(error?: SemanticError) {
        super(error);
    }
}
