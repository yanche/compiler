
import * as prod from '../../productions';
import * as dfa from '../../DFA';
import Parser from '../parser';
import * as c from '../../compile';
import * as utility from '../../utility';

//FOR LR parse-table
abstract class Action { }
class ShiftAction extends Action {
    constructor(public toStateNum: number) { super(); }
}
class ReduceAction extends Action {
    constructor(public nont: number, public rhslen: number, public prodid: number) { super(); }
}
class AcceptAction extends Action { }

export interface LR0Item {
    prodid: number;
    dot: number;
    prod: prod.ProductionRef;
    itemnum: number;
}

export class LR0ItemsDef {
    private _itemnummap: Array<Array<number>>;
    private _numitemmap: Array<LR0Item>;
    private _startitems: Array<number>;

    get size(): number { return this._numitemmap.length; }
    getItemNumsByProdId(prodid: number): Array<number> { return this._itemnummap[prodid]; }
    getStartItemNums(): Array<number> { return this._startitems; }
    getItem(itemnum: number): LR0Item { return this._numitemmap[itemnum]; }

    constructor(prodset: prod.ProdSet) {
        let prodids = prodset.getProdIds(), startnontnum = prodset.getStartNonTerminal(), itemnummap = new Array<Array<number>>(prodids.length), itemidgen = new utility.IdGen(), numitemmap = new Array<LR0Item>();

        //prodid from 0 -> prodsize - 1
        //build the item num mapping
        for (let prodid of prodids) {
            let prod = prodset.getProdRef(prodid);
            let start = prod.lnum === startnontnum;
            let arr = new Array<number>(prod.rnums.length + 1);
            for (let i = 0; i <= prod.rnums.length; ++i) {
                let itemid = itemidgen.next();
                arr[i] = itemid;
                numitemmap.push({ prodid: prodid, dot: i, prod: prod, itemnum: itemid });
            }
            itemnummap[prodid] = arr;
        }

        this._itemnummap = itemnummap;
        this._numitemmap = numitemmap;
        this._startitems = prodset.getProds(startnontnum).map(p => itemnummap[p][0]);
    }
}

export abstract class LRParser extends Parser {
    protected _parsetable: LRParseTable;

    isValid(): boolean {
        return this._parsetable.isValid();
    }
    parse(tokens: Array<c.Token>): c.ParseReturn {
        return this._parsetable.parse(tokens);
    }
    stringifyAmbCells(): string {
        let strarr = [this._parsetable.stringifyAmbCells(), '', ''];
        let dfastatestoprint = this._parsetable.ambCells();
        for (let d of dfastatestoprint)
            strarr.push(this.stringify1DFA(d));
        return strarr.join('\r\n');
    }
    stateCount(): number {
        return this._parsetable.stateCount();
    }
    abstract stringifyDFA(): string;
    abstract stringify1DFA(dfastatenum: number): string;
}

//LR parse table, LR(0), LR(1), SLR(1)
export class LRParseTable {
    private _ptable: Map<number, Map<number, Array<Action>>>;
    private _ambcells: Map<number, Set<number>>;
    private _prodset: prod.ProdSet;
    private _startstate: number;

    constructor(prodset: prod.ProdSet) {
        this._ptable = new Map<number, Map<number, Array<Action>>>();
        this._ambcells = new Map<number, Set<number>>();
        this._prodset = prodset;
        this._startstate = null;
    }
    get startState(): number { return this._startstate; }
    set startState(val: number) { this._startstate = val; }
    addAcceptAction(dfastatenum: number, symnum: number): this {
        return this.addAction(dfastatenum, symnum, new AcceptAction());
    }
    addShiftAction(dfastatenum: number, tranmap: Array<Array<number>>): this {
        for (let tran of tranmap) {
            //tran[0]: sym number, tran[1]: dfa state number
            this.addAction(dfastatenum, tran[0], new ShiftAction(tran[1]));
        }
        return this;
    }
    addReduceAction(dfastatenum: number, symnum: number, lnum: number, reducecount: number, prodid: number) {
        this.addAction(dfastatenum, symnum, new ReduceAction(lnum, reducecount, prodid));
        return this;
    }
    private addAction(dfastatenum: number, symnum: number, action: Action): this {
        let row = this.initRow(dfastatenum);
        let acts = row.get(symnum);
        if (acts == null) row.set(symnum, [action]);
        else {
            acts.push(action);
            this.markAmbiguousCell(dfastatenum, symnum);
        }
        return this;
    }
    private markAmbiguousCell(dfastatenum: number, symnum: number): this {
        if (this._ambcells.has(dfastatenum)) this._ambcells.get(dfastatenum).add(symnum);
        else this._ambcells.set(dfastatenum, new Set<number>().add(symnum));
        return this;
    }
    private initRow(dfastatenum: number): Map<number, Array<Action>> {
        let ret = this._ptable.get(dfastatenum);
        if (ret == null) {
            ret = new Map<number, Array<Action>>()
            this._ptable.set(dfastatenum, ret);
        }
        return ret;
    }
    parse(tokens: Array<c.Token>): c.ParseReturn {
        if (!this.isValid()) throw new Error('the grammar is not valid');
        if (this._startstate == null) throw new Error('start state is not specified');
        let stack = new Array<{ tnode: c.ParseTreeNode, state: number }>(), i = 0, len = tokens.length;
        stack.push({ tnode: null, state: this._startstate });
        let stacktop = 0;
        while (i <= len) {
            let token: c.Token = ((i === len) ? new c.Token('', 0, c.noArea) : tokens[i]), stackitem = stack[stacktop];
            let acts = this._ptable.get(stackitem.state).get(token.symnum);
            if (acts == null || acts.length === 0) return new c.ParseReturn(false, null, 'input not acceptable: ' + this._prodset.getSymInStr(token.symnum) + ' at ' + token.area, 1);
            let act = acts[0];
            if (act instanceof ShiftAction) {
                stack[++stacktop] = { tnode: new c.ParseTreeTermNode(token.symnum, this._prodset, token), state: act.toStateNum };
                ++i;
            }
            else if (act instanceof ReduceAction) {
                let newstacktop = stacktop - act.rhslen;
                let midnode = new c.ParseTreeMidNode(act.nont, this._prodset, act.prodid, stack.slice(newstacktop + 1, stacktop + 1).map(x => x.tnode));
                let newact = this._ptable.get(stack[newstacktop].state).get(act.nont)[0];
                if (newact instanceof ShiftAction) {
                    stack[++newstacktop] = { tnode: midnode, state: newact.toStateNum };
                    stacktop = newstacktop;
                }
                else if (newact instanceof AcceptAction) {
                    if (i === len) return new c.ParseReturn(true, midnode);
                    else return new c.ParseReturn(false, null, 'input not acceptable, reach to the end of parsing before consume all tokens', 2);
                }
                else throw new Error('impossible code path'); //reserved code path, should be no possible here
            }
            else throw new Error('impossible code path, 2'); //reserved code path, should be no possible here
        }
        throw new Error('impossible code path, 3'); //reserved code path, should be no possible here
    }
    isValid(): boolean {
        return this._ambcells.size === 0;
    }
    ambCells(): Set<number> {
        let dfastates = new Set<number>();
        for (let amb of this._ambcells) {
            dfastates.add(amb[0]);
        }
        return dfastates;
    }
    stringifyAmbCells(): string {
        let strarr = new Array<string>();
        for (let amb of this._ambcells) {
            let dfastatenum = amb[0], syms = amb[1];
            strarr.push('dfa state: ' + dfastatenum);
            let row = this._ptable.get(dfastatenum);
            for (let symnum of syms) {
                strarr.push('    on terminal symbol: ' + this._prodset.getSymInStr(symnum));
                for (let act of row.get(symnum)) {
                    if (act instanceof AcceptAction) {
                        strarr.push('        accept');
                    }
                    else if (act instanceof ShiftAction) {
                        strarr.push('        shift to dfa-state: ' + act.toStateNum);
                    }
                    else if (act instanceof ReduceAction) {
                        strarr.push('        reduce using production: ' + this._prodset.getProdRef(act.prodid).prod.toString());
                    }
                }
            }
        }
        return strarr.join('\r\n');
    }
    stateCount(): number {
        return this._ptable.size;
    }
}

export function itemInStr(bitem: LR0Item, symnums: Array<number>, prodset: prod.ProdSet): string {
    let rnums = bitem.prod.rnums;
    let arr = new Array<string>(), i = 0, len = rnums.length;
    while (i <= len) {
        if (i === bitem.dot) arr[i] = '.';
        else if (i > bitem.dot) arr[i] = prodset.getSymInStr(rnums[i - 1]);
        else arr[i] = prodset.getSymInStr(rnums[i]);
        ++i;
    }
    return prodset.getSymInStr(bitem.prod.lnum) + ' -> ' + arr.join(' ') + ' , LA:' + symnums.map(x => prodset.getSymInStr(x)).join(',');
}
