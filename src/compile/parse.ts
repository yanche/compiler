
import * as prod from "../productions";
import * as l from "./lex";

export abstract class ParseTreeNode {
    protected _symnum: number;
    private _prodset: prod.ProdSet;

    get symnum(): number { return this._symnum; }

    get symstr(): string { return this._prodset.getSymInStr(this._symnum); }

    abstract area(): l.Area;

    constructor(sym: number, prodset: prod.ProdSet) {
        this._symnum = sym;
        this._prodset = prodset;
    }
}

export class ParseTreeMidNode extends ParseTreeNode {
    private _children: Array<ParseTreeNode>;
    private _area: l.Area;
    public prodId: number;

    constructor(symnum: number, prodset: prod.ProdSet, prodid?: number, children?: Array<ParseTreeNode>) {
        super(symnum, prodset);
        this._children = children;
        this.prodId = prodid;
    }

    get children(): Array<ParseTreeNode> {
        return this._children;
    }

    set children(c: Array<ParseTreeNode>) {
        if (this._children) throw new Error("children exists");
        this._children = c;
    }

    area(): l.Area {
        if (this._area) return this._area;
        else {
            let area: l.Area = null;
            if (this._children.length === 0) area = l.noArea;
            else area = new l.Area(this._children[0].area().start, this._children[this._children.length - 1].area().end);
            return this._area = area;
        }
    }
}

export class ParseTreeTermNode extends ParseTreeNode {
    private _token: l.Token;

    constructor(symnum: number, prodset: prod.ProdSet, token?: l.Token) {
        super(symnum, prodset);
        if (token)
            this.token = token;
    }

    get token(): l.Token {
        return this._token;
    }

    set token(t: l.Token) {
        if (this._symnum !== t.symnum) throw new Error(`symbol does not match: ${this._symnum}, ${t.symnum}`);
        this._token = t;
    }

    area(): l.Area {
        return this._token.area;
    }
}
