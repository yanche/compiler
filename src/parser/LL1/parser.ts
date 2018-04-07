
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

        const followSets = prodset.followSet();
        for (const nont of prodset.getNonTerminals()) {
            this._getOrCreateParseRow(nont);
            for (const prodId of prodset.getProds(nont)) {
                const rhsIds = prodset.getProdRef(prodId).rhsIds;
                // calc the first set of RHS of production
                const { nullable, firstSet } = prodset.firstSetOfSymbols(rhsIds);
                // when nont encounters symbol s, use production w/ prodid
                for (const s of firstSet) this._bookKeeping(nont, s, prodId);
                // if nullable, add follow set
                if (nullable) {
                    for (const f of followSets[nont]) this._bookKeeping(nont, f, prodId);
                }
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
                else return createParseErrorReturn(new NotAcceptableError(`expecting symbol: ${nodeSymStr} but get: ${tokenSymStr} at ${token.area}`));
                ++i;
            }
            else if (node instanceof ParseTreeMidNode) {
                const prods = this._table.get(stacktop.symId)!.get(token.symId) || [];
                if (prods.length === 0) return createParseErrorReturn(new NotAcceptableError(`unexpected symbol: ${tokenSymStr} at ${token.area}`));
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

    private _bookKeeping(ntsym: number, tsym: number, prodId: number): this {
        const row = this._getOrCreateParseRow(ntsym);
        if (!row.has(tsym)) {
            row.set(tsym, []);
        }
        const col = row.get(tsym)!;

        if (col.every(x => x !== prodId)) {
            const ambiguity = col.some(x => x !== prodId);
            if (ambiguity) {
                // more than one choice for same non-termial/terminal pair, conflict happens
                this._valid = false;
            }
            col.push(prodId);
        }
        return this;
    }

    private _getOrCreateParseRow(ntsym: number): Map<number, number[]> {
        if (!this._table.has(ntsym)) {
            this._table.set(ntsym, new Map<number, number[]>());
        }
        return this._table.get(ntsym)!;
    }
}