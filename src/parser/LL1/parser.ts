
import { ProdSet } from "../../productions";
import { ParseTreeNode, Token, ParseTreeMidNode, ParseTreeTermNode, ParseReturn, Parser } from "../../compile";
import { NeedMoreTokensError, TooManyTokensError, NotAcceptableError, createParseErrorReturn } from "../error";

export default class LL1Parser extends Parser {
    private _table: Map<number, Map<number, number[]>>;
    private _valid: boolean;

    constructor(prodset: ProdSet) {
        super(prodset);
        this._table = new Map<number, Map<number, number[]>>();
        this._valid = true;

        const firstSets = prodset.firstSet();
        const followSets = prodset.followSet();
        const nullableNonTerminals = prodset.nullableNonTerminals();

        for (let nont of prodset.getNonTerminals()) {
            this._getOrCreateParseRow(nont);
            for (let prodid of prodset.getProds(nont)) {
                const rsymarr = prodset.getProdRef(prodid).rhsIds;
                const syms = new Set<number>();
                let gonull = true, idx = 0;
                // calc the first set of RHS of production
                while (idx < rsymarr.length && gonull) {
                    const rsym = rsymarr[idx++];
                    for (let f of firstSets[rsym]) syms.add(f);
                    gonull = nullableNonTerminals.has(rsym);
                }
                if (gonull) {
                    for (let f of followSets[nont]) syms.add(f);
                }
                // when nont encounters symbol s, use production w/ prodid
                for (let s of syms)
                    this._bookKeeping(nont, s, prodid);
            }
        }
    }

    public get valid(): boolean { return this._valid; }

    public parse(tokens: Token[]): ParseReturn {
        if (tokens.length === 0 || tokens[tokens.length - 1].symId !== 0) throw new Error("the last token must be '$', stands for the end of tokens");
        if (!this.valid) throw new Error("the grammar is not a valid LL(1)");

        const startsym = this._prodset.getStartNonTerminal();
        const root = new ParseTreeMidNode(startsym);
        const stack: { node: ParseTreeNode, symId: number }[] = [{ node: root, symId: startsym }];
        let i = 0;
        while (stack.length > 0 && i < tokens.length) {
            const stacktop = stack.pop()!;
            const token = tokens[i];
            const node = stacktop.node;
            const nodeSymStr = this._prodset.getSymInStr(node.symId);
            const tokenSymStr = this._prodset.getSymInStr(token.symId);
            if (node instanceof ParseTreeTermNode) {
                if (node.symId === token.symId) node.token = token;
                else if (i === tokens.length - 1) return createParseErrorReturn(new NeedMoreTokensError());
                else return createParseErrorReturn(new NotAcceptableError(`terminal symbol at top of stack: ${nodeSymStr} does not match with token symbol: ${tokenSymStr}`));
                ++i;
            }
            else if (node instanceof ParseTreeMidNode) {
                const prods = this._table.get(stacktop.symId)!.get(token.symId) || [];
                if (prods.length === 0) return createParseErrorReturn(new NotAcceptableError(`no production is found for: ${nodeSymStr}, ${tokenSymStr}`));
                if (prods.length > 1) throw new Error(`defensive code, more than 1 productions are found for: ${node.symId}, ${token.symId}`);
                const prodId = prods[0];
                const newStackItems = this._prodset.getProdRef(prodId).rhsIds.map(sym => {
                    return { node: this._prodset.isSymIdTerminal(sym) ? new ParseTreeTermNode(sym) : new ParseTreeMidNode(sym), symId: sym };
                });
                node.children = newStackItems.map(n => n.node);
                node.prodId = prodId;
                for (let j = newStackItems.length - 1; j >= 0; --j) stack.push(newStackItems[j]);
            }
            else throw new Error("node neither a termnode nor a midnode");
        }
        if (stack.length !== 0) return createParseErrorReturn(new NeedMoreTokensError());
        else if (i === tokens.length - 1) return new ParseReturn(root);
        else return createParseErrorReturn(new TooManyTokensError());
    }

    private _bookKeeping(ntsym: number, tsym: number, prodnum: number): this {
        const row = this._getOrCreateParseRow(ntsym);
        let col = row.get(tsym);
        if (!col) {
            col = [];
            row.set(tsym, col);
        }
        else {
            // more than one choice for same non-termial/terminal pair, conflict happens
            this._valid = false;
        }
        col.push(prodnum);
        return this;
    }

    private _getOrCreateParseRow(ntsym: number): Map<number, number[]> {
        let row = this._table.get(ntsym);
        if (!row) {
            row = new Map<number, number[]>();
            this._table.set(ntsym, row);
        }
        return row;
    }
}