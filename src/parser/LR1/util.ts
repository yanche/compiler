
import { ProdSet, ProductionRef } from "../../productions";
import { DFA } from "../../DFA";
import { ParseReturn, ParseTreeMidNode, ParseTreeTermNode, ParseTreeNode, Token, Parser } from "../../compile";
import { IdGen, range, automata } from "../../utility";
import { createNFA } from '../../NFA';
import { NeedMoreTokensError, TooManyTokensError, NotAcceptableError } from "../error";

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
    prod: ProductionRef;
    itemnum: number;
}

export class LR0ItemsPack {
    private _proditemsmap: Array<Array<number>>;
    private _numitemmap: Array<LR0Item>;
    private _startitems: Array<number>;

    get size(): number { return this._numitemmap.length; }

    getItemNumsByProdId(prodid: number): Array<number> { return this._proditemsmap[prodid]; }

    getStartItemNums(): Array<number> { return this._startitems; }

    getItem(itemnum: number): LR0Item { return this._numitemmap[itemnum]; }

    constructor(prodset: ProdSet) {
        let prodids = prodset.getProdIds(), startnontnum = prodset.getStartNonTerminal(), proditemsmap = new Array<Array<number>>(prodids.length);
        let itemidgen = new IdGen(), numitemmap = new Array<LR0Item>();

        //prodid from 0 -> prodsize - 1
        //build the item num mapping
        for (let prodid of prodids) {
            let prod = prodset.getProdRef(prodid);
            let arr = new Array<number>(prod.rnums.length + 1);
            for (let i = 0; i <= prod.rnums.length; ++i) {
                let itemid = itemidgen.next();
                arr[i] = itemid;
                numitemmap.push({ prodid: prodid, dot: i, prod: prod, itemnum: itemid });
            }
            proditemsmap[prodid] = arr;
        }

        this._proditemsmap = proditemsmap;
        this._numitemmap = numitemmap;
        this._startitems = prodset.getProds(startnontnum).map(p => proditemsmap[p][0]);
    }
}

export abstract class LRParser extends Parser {
    private _ptable: Map<number, Map<number, Array<Action>>>;
    private _ambcells: Map<number, Set<number>>;
    protected _startstate: number;

    constructor(prodset: ProdSet) {
        super(prodset);
        this._ptable = new Map<number, Map<number, Array<Action>>>();
        this._ambcells = new Map<number, Set<number>>();
        this._startstate = null;
    }

    // stringifyAmbCells(): string {
    //     let strarr = [this._parsetable.stringifyAmbCells(), "", ""];
    //     let dfastatestoprint = this._parsetable.ambCells();
    //     for (let d of dfastatestoprint)
    //         strarr.push(this.stringify1DFA(d));
    //     return strarr.join("\r\n");
    // }

    // abstract stringifyDFA(): string;
    // abstract stringify1DFA(dfastatenum: number): string;

    // get startState(): number { return this._startstate; }
    // set startState(val: number) { this._startstate = val; }

    protected addAcceptAction(dfastatenum: number, symnum: number): this {
        return this._addAction(dfastatenum, symnum, new AcceptAction());
    }

    protected addShiftAction(dfastatenum: number, symnum: number, tgtdfanum: number): this {
        return this._addAction(dfastatenum, symnum, new ShiftAction(tgtdfanum));
    }

    protected addReduceAction(dfastatenum: number, symnum: number, lnum: number, reducecount: number, prodid: number) {
        this._addAction(dfastatenum, symnum, new ReduceAction(lnum, reducecount, prodid));
        return this;
    }

    private _addAction(dfastatenum: number, symnum: number, action: Action): this {
        let row = this._initRow(dfastatenum);
        let acts = row.get(symnum);
        if (!acts) row.set(symnum, [action]);
        else {
            acts.push(action);
            this._markAmbiguousCell(dfastatenum, symnum);
        }
        return this;
    }

    private _markAmbiguousCell(dfastatenum: number, symnum: number): this {
        if (this._ambcells.has(dfastatenum)) this._ambcells.get(dfastatenum).add(symnum);
        else this._ambcells.set(dfastatenum, new Set<number>().add(symnum));
        return this;
    }

    private _initRow(dfastatenum: number): Map<number, Array<Action>> {
        let ret = this._ptable.get(dfastatenum);
        if (!ret) {
            ret = new Map<number, Array<Action>>()
            this._ptable.set(dfastatenum, ret);
        }
        return ret;
    }

    parse(tokens: Array<Token>): ParseReturn {
        if (tokens.length === 0 || tokens[tokens.length - 1].symnum !== 0) throw new Error("the last token must be '$', stands for the end of tokens");
        if (!this.isValid()) throw new Error("the grammar is not valid");
        if (this._startstate == null) throw new Error("start state is not specified");
        let stack = new Array<{ tnode: ParseTreeNode, state: number }>(), i = 0, len = tokens.length;
        stack.push({ tnode: null, state: this._startstate });
        let stacktop = 0;
        while (i < len) {
            let token = tokens[i], stackitem = stack[stacktop];
            let acts = this._ptable.get(stackitem.state).get(token.symnum);
            if (!acts || acts.length === 0) return new ParseReturn(null, new NotAcceptableError(`input not acceptable: ${this._prodset.getSymInStr(token.symnum)} at ${token.area}`));
            let act = acts[0];
            if (act instanceof ShiftAction) {
                stack[++stacktop] = { tnode: new ParseTreeTermNode(token.symnum, token), state: act.toStateNum };
                ++i;
            }
            else if (act instanceof ReduceAction) {
                let newstacktop = stacktop - act.rhslen;
                let midnode = new ParseTreeMidNode(act.nont, act.prodid, stack.slice(newstacktop + 1, stacktop + 1).map(x => x.tnode));
                let newact = this._ptable.get(stack[newstacktop].state).get(act.nont)[0];
                if (newact instanceof ShiftAction) {
                    stack[++newstacktop] = { tnode: midnode, state: newact.toStateNum };
                    stacktop = newstacktop;
                }
                else throw new Error("impossible code path"); //reserved code path, should be no possible here
            }
            else if (act instanceof AcceptAction) {
                if (i !== len - 1) return new ParseReturn(null, new TooManyTokensError());
                else if (stacktop !== 1) return new ParseReturn(null, new NeedMoreTokensError());
                else return new ParseReturn(<ParseTreeMidNode>stackitem.tnode);
            }
            else throw new Error("impossible code path, 2"); //reserved code path, should be no possible here
        }
        throw new Error("impossible code path, 3"); //reserved code path, should be no possible here
    }

    isValid(): boolean {
        return this._ambcells.size === 0;
    }

    // ambCells(): Set<number> {
    //     let dfastates = new Set<number>();
    //     for (let amb of this._ambcells) {
    //         dfastates.add(amb[0]);
    //     }
    //     return dfastates;
    // }

    // stringifyAmbCells(): string {
    //     let strarr = new Array<string>();
    //     for (let amb of this._ambcells) {
    //         let dfastatenum = amb[0], syms = amb[1];
    //         strarr.push("dfa state: " + dfastatenum);
    //         let row = this._ptable.get(dfastatenum);
    //         for (let symnum of syms) {
    //             strarr.push("    on terminal symbol: " + this._prodset.getSymInStr(symnum));
    //             for (let act of row.get(symnum)) {
    //                 if (act instanceof AcceptAction) {
    //                     strarr.push("        accept");
    //                 }
    //                 else if (act instanceof ShiftAction) {
    //                     strarr.push("        shift to dfa-state: " + act.toStateNum);
    //                 }
    //                 else if (act instanceof ReduceAction) {
    //                     strarr.push("        reduce using production: " + this._prodset.getProdRef(act.prodid).prod.toString());
    //                 }
    //             }
    //         }
    //     }
    //     return strarr.join("\r\n");
    // }

    // stateCount(): number {
    //     return this._ptable.size;
    // }
}

// export function itemInStr(bitem: LR0Item, symnums: Array<number>, prodset: prod.ProdSet): string {
//     let rnums = bitem.prod.rnums;
//     let arr = new Array<string>(), i = 0, len = rnums.length;
//     while (i <= len) {
//         if (i === bitem.dot) arr[i] = ".";
//         else if (i > bitem.dot) arr[i] = prodset.getSymInStr(rnums[i - 1]);
//         else arr[i] = prodset.getSymInStr(rnums[i]);
//         ++i;
//     }
//     return prodset.getSymInStr(bitem.prod.lnum) + " -> " + arr.join(" ") + " , LA:" + symnums.map(x => prodset.getSymInStr(x)).join(",");
// }


//PRIVATE CLASS, represent the DFA of SLR1 parser
export class LR0DFA extends DFA {
    private _lr0itempack: LR0ItemsPack;
    private _dfaitemsmap: Map<number, Set<number>>;
    private _acceptableDFAState: number;

    getItemsInState(statenum: number): Array<LR0Item> {
        return [...this._dfaitemsmap.get(statenum)].map(itemnum => this._lr0itempack.getItem(itemnum));
    }

    get lr0ItemPack(): LR0ItemsPack { return this._lr0itempack; }

    get acceptableDFAState(): number { return this._acceptableDFAState; }

    constructor(prodset: ProdSet) {
        let nfatrans = new Array<automata.Transition>();

        //number of item, is the number of NFA
        let lr0itempack = new LR0ItemsPack(prodset);

        for (let prodid of prodset.getProdIds()) {
            let prod = prodset.getProdRef(prodid), itemnumarr = lr0itempack.getItemNumsByProdId(prodid);
            for (let i = 0; i < prod.rnums.length; ++i) {
                let rnum = prod.rnums[i], curitem = itemnumarr[i];
                let rsymstr = prodset.getSymInStr(rnum);
                nfatrans.push(new automata.Transition(curitem, itemnumarr[i + 1], rsymstr));
                if (!prodset.isSymNumTerminal(rnum)) {
                    for (let prodid2 of prodset.getProds(rnum)) {
                        nfatrans.push(new automata.Transition(curitem, lr0itempack.getItemNumsByProdId(prodid2)[0], ''));
                    }
                }
            }
        }

        let dfat = createNFA(nfatrans, lr0itempack.getStartItemNums(), range(lr0itempack.size)).getDFATrans();
        super(dfat.dfaTrans, dfat.startid, dfat.terminals);
        this._dfaitemsmap = dfat.dfa2nfaStateMap;
        this._lr0itempack = lr0itempack;
        const startProds = prodset.getProds(prodset.getSymNum(ProdSet.reservedStartNonTerminal));
        if (startProds.length !== 1) throw new Error(`defensive code, only one start production from: ${ProdSet.reservedStartNonTerminal} should be`);
        const startProdLR0Items = lr0itempack.getItemNumsByProdId(startProds[0]);
        if (startProdLR0Items.length !== 2) throw new Error(`defensive code, only two start production LR0 items from: ${ProdSet.reservedStartNonTerminal} should be`);
        const startDFA = dfat.nfa2dfaStateMap.get(startProdLR0Items[1]);
        if (!startDFA || startDFA.size !== 1) throw new Error("defensive code, DFA state not found or more than 1");
        this._acceptableDFAState = [...startDFA][0];
    }
}
