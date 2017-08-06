
import * as p from "./parse";
import * as l from "./lex";
import { CompileError, SyntaxError, LexError, SemanticError } from "./error";

export abstract class StageReturn<T extends CompileError> {
    protected _accept: boolean;
    protected _error: T;

    constructor(accept: boolean, error?: T) {
        if (accept) {
            if (error) throw new Error("compile-error must not be specified if language is accepted");
        }
        else {
            if (!error) throw new Error("must provide an compile-error if language is not accepted");
        }
        this._accept = accept;
        this._error = error;
    }

    get accept(): boolean { return this._accept; }

    get error(): T { return this._error; }
}

export class CompileReturn extends StageReturn<CompileError> { }

export class ParseReturn extends StageReturn<SyntaxError> {
    private _root: p.ParseTreeMidNode;

    constructor(accept: boolean, root: p.ParseTreeMidNode, error?: SyntaxError) {
        super(accept, error);
        if (accept) {
            if (!root) throw new Error("must provide a root node of parse tree if accepted");
        }
        else {
            if (root) throw new Error("root node must not be specified if not accepted");
        }
        this._root = root;
    }

    get root(): p.ParseTreeMidNode { return this._root; }
}

export class LexReturn extends StageReturn<LexError> {
    private _tokens: Array<l.Token>;

    constructor(accept: boolean, tokens: Array<l.Token>, error?: LexError) {
        super(accept, error);
        if (accept) {
            if (!tokens) throw new Error("must provide tokens of parse tree if accepted");
        }
        else {
            if (tokens) throw new Error("tokens must not be specified if not accepted");
        }
        this._tokens = tokens;
    }

    get tokens(): Array<l.Token> { return this._tokens; }
}

export abstract class SemanticCheckReturn extends StageReturn<SemanticError> {
    constructor(accept: boolean, error?: SemanticError) {
        super(accept, error);
    }
}
