
import * as utility from "../../utility";
import { ProdSet } from "../../productions";
import { ParseTreeNode, Token, ParseTreeMidNode, ParseTreeTermNode, ParseReturn, noArea, Parser } from "../../compile";
import { NeedMoreTokensError, TooManyTokensError, NotAcceptableError } from "../error";

export default class LL1Parser extends Parser {
    private _table: Map<number, Map<number, Array<number>>>;
    private _valid: boolean;

    constructor(prodset: ProdSet) {
        super(prodset);
        this._table = new Map<number, Map<number, Array<number>>>();
        this._valid = true;
        let firstsets = prodset.firstSet(), followsets = prodset.followSet(), nullablenonterminals = prodset.nullableNonTerminals();
        for (let nont of prodset.getNonTerminals()) {
            let follow = followsets[nont];
            this._getOrCreateParseRow(nont);
            for (let prodid of prodset.getProds(nont)) {
                let rsymarr = prodset.getProdRef(prodid).rnums;
                let gonull = true, idx = 0, syms = new Set<number>();
                while (idx < rsymarr.length && gonull) {
                    let rsym = rsymarr[idx];
                    gonull = nullablenonterminals.has(rsym);
                    for (let f of firstsets[rsym]) syms.add(f);
                    ++idx;
                }
                if (gonull) {
                    for (let f of follow) syms.add(f);
                }
                for (let s of syms)
                    this._add(nont, s, prodid);
            }
        }
    }

    isValid(): boolean { return this._valid; }

    parse(tokens: Array<Token>): ParseReturn {
        if (tokens.length === 0 || tokens[tokens.length - 1].symnum !== 0) throw new Error("the last token must be '$', stands for the end of tokens");
        if (!this._valid) throw new Error("the grammar is not a valid LL(1)");
        let startsym = this._prodset.getStartNonTerminal();
        let stack = new Array<{ node: ParseTreeNode, symnum: number }>(), root = new ParseTreeMidNode(startsym), i = 0;
        stack.push({ node: root, symnum: startsym });
        while (stack.length > 0 && i < tokens.length) {
            let stacktop = stack.pop();
            let token = tokens[i];
            let node = stacktop.node;
            if (node instanceof ParseTreeTermNode) {
                if (node.symnum === token.symnum) node.token = token;
                else throw new Error("should not happen, terminal symbol at top of stack does not match with token symbol");
                ++i;
            }
            else if (node instanceof ParseTreeMidNode) {
                let prods = this._table.get(stacktop.symnum).get(token.symnum) || [];
                if (prods.length === 0) return new ParseReturn(false, null, new NotAcceptableError(`no production is found for: ${this._prodset.getSymInStr(node.symnum)}, ${this._prodset.getSymInStr(token.symnum)}`));
                if (prods.length > 1) throw new Error(`defensive code, more than 1 productions are found for: ${node.symnum}, ${token.symnum}`);
                let prodid = prods[0];
                let newstackitems = this._prodset.getProdRef(prodid).rnums.map(sym => {
                    return { node: this._prodset.isSymNumTerminal(sym) ? new ParseTreeTermNode(sym) : new ParseTreeMidNode(sym), symnum: sym };
                });
                node.children = newstackitems.map(n => n.node);
                node.prodId = prodid;
                for (let j = newstackitems.length - 1; j >= 0; --j) stack.push(newstackitems[j]);
            }
            else throw new Error("node neither a termnode nor a midnode");
        }
        if (stack.length !== 0) return new ParseReturn(false, null, new NeedMoreTokensError());
        else if (i === tokens.length - 1) return new ParseReturn(true, root);
        else return new ParseReturn(false, null, new TooManyTokensError());
    }

    private _add(ntsym: number, tsym: number, prodnum: number): this {
        let row = this._getOrCreateParseRow(ntsym);
        let col = row.get(tsym);
        if (!col) {
            col = [];
            row.set(tsym, col);
        }
        else {
            this._valid = false;
        }
        col.push(prodnum);
        return this;
    }

    private _getOrCreateParseRow(ntsym: number): Map<number, Array<number>> {
        let row = this._table.get(ntsym);
        if (!row) {
            row = new Map<number, Array<number>>();
            this._table.set(ntsym, row);
        }
        return row;
    }
}