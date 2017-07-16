
import * as utility from '../../utility';
import * as prod from '../../productions';
import * as c from '../../compile';
import Parser from '../parser';

class LL1ParseTable {
    private _table: Map<number, Map<number, Array<number>>>;
    private _valid: boolean;
    private _prodset: prod.ProdSet;
    constructor(prodset: prod.ProdSet) {
        this._table = new Map<number, Map<number, Array<number>>>();
        this._valid = true;
        this._prodset = prodset;
    }
    valid(): boolean { return this._valid; }
    add(ntsym: number, tsym: number, prodnum: number): this {
        let row = this.getOrCreateParseRow(ntsym);
        let col = row.get(tsym);
        if (col == null) {
            col = new Array<number>();
            row.set(tsym, col);
        }
        else
            this._valid = false;
        col.push(prodnum);
        return this;
    }
    addRange(ntsym: number, tsyms: Iterable<number>, prodnum: number): this {
        for (let tsym of tsyms) {
            this.add(ntsym, tsym, prodnum);
        }
        return this;
    }
    getOrCreateParseRow(ntsym: number): Map<number, Array<number>> {
        let row = this._table.get(ntsym);
        if (row == null) {
            row = new Map<number, Array<number>>();
            this._table.set(ntsym, row);
        }
        return row;
    }
    getProds(ntsym: number, tsym: number): Array<number> {
        return this._table.get(ntsym).get(tsym) || [];
    }
    // getSingleProduction(nont: string, termi: string): Array<prod.Symbol> {
    //     let prods = this.getProduction(nont, termi);
    //     if (prods.length === 1) return prods[0];
    //     if (prods.length === 0) throw new Error('no production by current non-terminal and terminal symbols: ' + nont + ', ' + termi);
    //     else throw new Error('more than one production exists for given non-terminal and terminal symbols: ' + nont + ', ' + termi);
    // }
    getParseRow(ntsym: number): Map<number, Array<number>> {
        return this._table.get(ntsym);
    }
    print(): this {
        if (!this._valid) console.log('this is an invalid parse table');
        for (let item of this._table) {
            console.log(this._prodset.getSymInStr(item[0]));
            for (let col of item[1]) {
                console.log('    ' + this._prodset.getSymInStr(col[0]));
                for (let prodid of col[1]) {
                    console.log('        ' + this._prodset.getProdRef(prodid).rnums.map(x => this._prodset.getSymInStr(x)).join(' '));
                }
            }
        }
        return this;
    }
    parse(tokens: Array<c.Token>, startsym: number): c.ParseReturn {
        if (!this._valid) throw new Error('the grammar is not a valid LL(1)');
        let stack = new Array<{ node: c.ParseTreeNode, symnum: number }>(), root = new c.ParseTreeMidNode(startsym, this._prodset), i = 0;
        stack.push({ node: root, symnum: startsym });
        while (stack.length > 0) {
            let stacktop = stack.pop(), token: c.Token = ((i === tokens.length) ? new c.Token('', 0, c.noArea) : tokens[i]);
            let node = stacktop.node;
            if (node instanceof c.ParseTreeTermNode) {
                if (node.symnum === token.symnum) node.token = token;
                else return new c.ParseReturn(false, null, 'should not happen, terminal symbol at top of stack does not match with token symbol', 1);
                ++i;
            }
            else if (node instanceof c.ParseTreeMidNode) {
                let prods = this.getProds(stacktop.symnum, token.symnum);
                if (prods.length === 0) return new c.ParseReturn(false, null, 'no production is found for: ' + node.symnum + ', ' + token.symnum, 2);
                if (prods.length > 1) return new c.ParseReturn(false, null, 'more than 1 productions are found for: ' + node.symnum + ', ' + token.symnum, 3);
                let prodid = prods[0];
                let newstackitems = this._prodset.getProdRef(prodid).rnums.map(sym => {
                    return { node: this._prodset.isSymNumTerminal(sym) ? new c.ParseTreeTermNode(sym, this._prodset) : new c.ParseTreeMidNode(sym, this._prodset), symnum: sym };
                });
                node.children = newstackitems.map(n => n.node);
                node.prodId = prodid;
                for (let j = newstackitems.length - 1; j >= 0; --j) stack.push(newstackitems[j]);
            }
        }
        if (i === tokens.length) return new c.ParseReturn(true, root);
        else return new c.ParseReturn(false, null, 'does not consume all input tokens', 4);
    }
}

export default class LL1Parser extends Parser {
    private _ptable: LL1ParseTable;
    constructor(prodset: prod.ProdSet) {
        super(prodset);
        let ptable = new LL1ParseTable(prodset);
        let firstsets = prodset.firstSet(), followsets = prodset.followSet(), nullablenonterminals = prodset.nullableNonTerminals();
        for (let nont of prodset.getNonTerminals()) {
            let follow = followsets[nont];
            ptable.getOrCreateParseRow(nont);
            for (let prodid of prodset.getProds(nont)) {
                let rsymarr = prodset.getProdRef(prodid).rnums;
                let gonull = true, idx = 0, syms = new Set<number>();
                while (idx < rsymarr.length && gonull) {
                    let rsym = rsymarr[idx];
                    gonull = nullablenonterminals.has(rsym);
                    for (let f of firstsets[rsym]) syms.add(f);
                    ++idx;
                }
                if (idx === rsymarr.length && gonull) {
                    for (let f of follow) syms.add(f);
                }
                ptable.addRange(nont, syms, prodid);
            }
        }
        this._ptable = ptable;
    }
    isValid(): boolean { return this._ptable.valid(); }
    parse(tokens: Array<c.Token>): c.ParseReturn {
        return this._ptable.parse(tokens, this._prodset.getStartNonTerminal());
    }
    getParseRow(nont: number): Map<number, Array<number>> {
        return this._ptable.getParseRow(nont);
    }
    getProduction(nont: number, termi: number): Array<number> {
        return this._ptable.getProds(nont, termi);
    }
    // getSingleProduction(nont: string, termi: string): Array<prod.Symbol> {
    //     return this._ptable.getSingleProduction(nont, termi);
    // }
    print(): this {
        this._ptable.print();
        return this;
    }
    getProdRef(prodid: number): prod.ProductionRef {
        return this._prodset.getProdRef(prodid);
    }
}