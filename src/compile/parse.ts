
import { Area, Token, noArea } from "./lex";
import { ProdSet } from '../productions';
import { ParseReturn } from './ret';
import { SymbolId, ProductionId } from "../utility";

export abstract class ParseTreeNode {
    public readonly symId: SymbolId;

    abstract get area(): Area;

    constructor(symId: SymbolId) {
        this.symId = symId;
    }
}

export class ParseTreeMidNode extends ParseTreeNode {
    private _children: ReadonlyArray<ParseTreeNode> | undefined;
    private _area: Area | undefined;
    private _prodId: ProductionId | undefined;

    public get prodId(): ProductionId {
        if (this._prodId === undefined) throw new Error("prodId not initialized");
        return this._prodId;
    }

    public set prodId(p: ProductionId) {
        if (this._prodId !== undefined) throw new Error("prodId has been initialized");
        this._prodId = p;
    }

    constructor(symId: SymbolId, prodId?: ProductionId, children?: ReadonlyArray<ParseTreeNode>) {
        super(symId);
        this._children = children;
        this._prodId = prodId;
    }

    public get children(): ReadonlyArray<ParseTreeNode> {
        if (!this._children) throw new Error("children not initialized");
        return this._children;
    }

    public set children(c: ReadonlyArray<ParseTreeNode>) {
        if (this._children) throw new Error("children has been initialized");
        this._children = c;
    }

    public get area(): Area {
        if (this._area) return this._area;
        else {
            if (this.children.length === 0) this._area = noArea;
            else this._area = new Area(this.children[0].area.start, this.children[this.children.length - 1].area.end);
            return this._area;
        }
    }
}

export class ParseTreeTermNode extends ParseTreeNode {
    private _token: Token | undefined;

    constructor(symId: SymbolId, token?: Token) {
        super(symId);
        if (token)
            this.token = token;
    }

    public get token(): Token {
        if (!this._token) throw new Error(`token not initialzed`);
        return this._token;
    }

    public set token(t: Token) {
        if (this.symId !== t.symId) throw new Error(`symbol does not match: ${this.symId}, ${t.symId}`);
        if (this._token) throw new Error(`token has been initialzed`);
        this._token = t;
    }

    public get area(): Area {
        return this.token.area;
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
