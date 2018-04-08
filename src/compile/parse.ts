
import { Area, Token, noArea } from "./lex";
import { ProdSet } from '../productions';
import { ParseReturn } from './ret';

export abstract class ParseTreeNode {
    protected _symId: number;
    // private _prodset: prod.ProdSet;

    public get symId(): number { return this._symId; }

    // get symstr(): string { return this._prodset.getSymInStr(this._symId); }

    abstract get area(): Area;

    constructor(sym: number) {
        this._symId = sym;
        // this._prodset = prodset;
    }
}

export class ParseTreeMidNode extends ParseTreeNode {
    private _children: Array<ParseTreeNode>;
    private _area: Area;
    public prodId: number;

    constructor(symId: number, prodId?: number, children?: Array<ParseTreeNode>) {
        super(symId);
        this._children = children;
        this.prodId = prodId;
    }

    public get children(): Array<ParseTreeNode> {
        return this._children;
    }

    public set children(c: Array<ParseTreeNode>) {
        if (this._children) throw new Error("children exists");
        this._children = c;
    }

    public get area(): Area {
        if (this._area) return this._area;
        else {
            let area: Area = null;
            if (this._children.length === 0) area = noArea;
            else area = new Area(this._children[0].area.start, this._children[this._children.length - 1].area.end);
            return this._area = area;
        }
    }
}

export class ParseTreeTermNode extends ParseTreeNode {
    private _token: Token;

    constructor(symId: number, token?: Token) {
        super(symId);
        if (token)
            this.token = token;
    }

    public get token(): Token {
        return this._token;
    }

    public set token(t: Token) {
        if (this._symId !== t.symId) throw new Error(`symbol does not match: ${this._symId}, ${t.symId}`);
        this._token = t;
    }

    public get area(): Area {
        return this._token.area;
    }
}

export abstract class Parser {
    protected _prodset: ProdSet;

    constructor(prodset: ProdSet) {
        this._prodset = prodset;
    }

    abstract parse(tokens: Array<Token>): ParseReturn;

    abstract get valid(): boolean;
}
