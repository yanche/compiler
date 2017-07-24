
import * as p from "./parse";
import * as l from "./lex";

export abstract class StageReturn {
    protected _accept: boolean;
    protected _errmsg: string;
    protected _errcode: number;

    constructor(accept: boolean, errmsg?: string, errcode?: number) {
        if (accept) {
            if (errmsg !== undefined || errcode !== undefined) throw new Error("errmsg and errcode must not be specified if accepted");
        }
        else {
            if (errcode === undefined) throw new Error("must provide an error code if not accepted");
        }
        this._accept = accept;
        this._errmsg = errmsg;
        this._errcode = errcode;
    }

    get accept(): boolean { return this._accept; }
    get errmsg(): string { return this._errmsg; }
    get errcode(): number { return this._errcode; }
}

export class ParseReturn extends StageReturn {
    private _root: p.ParseTreeMidNode;

    constructor(accept: boolean, root: p.ParseTreeMidNode, errmsg?: string, errcode?: number) {
        super(accept, errmsg, errcode);
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

export class CompileReturn extends StageReturn { }

export class LexReturn extends StageReturn {
    private _tokens: Array<l.Token>;

    constructor(accept: boolean, tokens: Array<l.Token>, errmsg?: string, errcode?: number) {
        super(accept, errmsg, errcode);
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

export abstract class SemanticCheckReturn extends StageReturn { }

export abstract class CompletenessCheckReturn extends StageReturn { }
