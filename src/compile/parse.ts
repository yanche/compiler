
import * as prod from "../productions";
import { Area, Token, noArea } from "./lex";
import { ProdSet } from '../productions';
import { ParseReturn } from './ret';

export abstract class ParseTreeNode {
    protected _symnum: number;
    // private _prodset: prod.ProdSet;

    get symnum(): number { return this._symnum; }

    // get symstr(): string { return this._prodset.getSymInStr(this._symnum); }

    abstract area(): Area;

    constructor(sym: number) {
        this._symnum = sym;
        // this._prodset = prodset;
    }
}

export class ParseTreeMidNode extends ParseTreeNode {
    private _children: Array<ParseTreeNode>;
    private _area: Area;
    public prodId: number;

    constructor(symnum: number, prodid?: number, children?: Array<ParseTreeNode>) {
        super(symnum);
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

    area(): Area {
        if (this._area) return this._area;
        else {
            let area: Area = null;
            if (this._children.length === 0) area = noArea;
            else area = new Area(this._children[0].area().start, this._children[this._children.length - 1].area().end);
            return this._area = area;
        }
    }
}

export class ParseTreeTermNode extends ParseTreeNode {
    private _token: Token;

    constructor(symnum: number, token?: Token) {
        super(symnum);
        if (token)
            this.token = token;
    }

    get token(): Token {
        return this._token;
    }

    set token(t: Token) {
        if (this._symnum !== t.symnum) throw new Error(`symbol does not match: ${this._symnum}, ${t.symnum}`);
        this._token = t;
    }

    area(): Area {
        return this._token.area;
    }
}

export abstract class Parser {
    protected _prodset: ProdSet;

    constructor(prodset: ProdSet) {
        this._prodset = prodset;
    }

    abstract parse(tokens: Array<Token>): ParseReturn;

    abstract isValid(): boolean;

    // get prodset(): ProdSet { return this._prodset; }
}
