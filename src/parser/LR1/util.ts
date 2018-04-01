
import { ProdSet, ProductionRef } from "../../productions";
import { DFA } from "../../DFA";
import { ParseReturn, ParseTreeMidNode, ParseTreeTermNode, ParseTreeNode, Token, Parser } from "../../compile";
import { range, automata } from "../../utility";
import { createNFA } from '../../NFA';
import { NeedMoreTokensError, TooManyTokensError, NotAcceptableError } from "../error";

//FOR LR parse-table
abstract class Action { }
class ShiftAction extends Action {
    constructor(public toStateNum: number) { super(); }
}
class ReduceAction extends Action {
    constructor(public nonTerminal: number, public rhsLen: number, public prodId: number) { super(); }
}
class AcceptAction extends Action { }

export interface LR0Item {
    prodId: number;
    dot: number;
    prod: ProductionRef;
    itemId: number;
}

export class LR0ItemsPack {
    private _prodItemsMap: Array<Array<number>>;
    private _idItemMap: Array<LR0Item>;
    private _startItems: Array<number>;

    get size(): number { return this._idItemMap.length; }

    getItemIdsByProdId(prodid: number): Array<number> { return this._prodItemsMap[prodid]; }

    getStartItemIds(): Array<number> { return this._startItems; }

    getItem(itemId: number): LR0Item { return this._idItemMap[itemId]; }

    constructor(prodset: ProdSet) {
        const prodIds = prodset.getProdIds();
        const prodItemsMap = new Array<Array<number>>(prodIds.length);
        const idItemMap = new Array<LR0Item>();

        //prodid from 0 -> prodsize - 1
        //build the item id mapping
        for (let prodId of prodIds) {
            const prod = prodset.getProdRef(prodId);
            const arr = new Array<number>(prod.rhsIds.length + 1);
            for (let i = 0; i <= prod.rhsIds.length; ++i) {
                const itemId = idItemMap.length;
                arr[i] = itemId;
                idItemMap.push({ prodId: prodId, dot: i, prod: prod, itemId: itemId });
            }
            prodItemsMap[prodId] = arr;
        }

        this._prodItemsMap = prodItemsMap;
        this._idItemMap = idItemMap;
        this._startItems = prodset.getProds(prodset.getStartNonTerminal()).map(p => prodItemsMap[p][0]);
    }
}

export abstract class LRParser extends Parser {
    // parsing table
    private _ptable: Map<number, Map<number, Array<Action>>>;
    private _ambCells: Map<number, Set<number>>;
    protected _startState: number;

    constructor(prodset: ProdSet) {
        super(prodset);
        this._ptable = new Map<number, Map<number, Array<Action>>>();
        this._ambCells = new Map<number, Set<number>>();
        this._startState = null;
    }

    // stringifyAmbCells(): string {
    //     let strarr = [this._parsetable.stringifyAmbCells(), "", ""];
    //     let dfastatestoprint = this._parsetable.ambCells();
    //     for (let d of dfastatestoprint)
    //         strarr.push(this.stringify1DFA(d));
    //     return strarr.join("\r\n");
    // }

    // abstract stringifyDFA(): string;
    // abstract stringify1DFA(dfaStateId: number): string;

    // get startState(): number { return this._startState; }
    // set startState(val: number) { this._startState = val; }

    protected addAcceptAction(dfaStateId: number, symId: number): this {
        return this._addAction(dfaStateId, symId, new AcceptAction());
    }

    protected addShiftAction(dfaStateId: number, symId: number, toDFAStateId: number): this {
        return this._addAction(dfaStateId, symId, new ShiftAction(toDFAStateId));
    }

    protected addReduceAction(dfaStateId: number, symId: number, lnum: number, reducecount: number, prodid: number): this {
        return this._addAction(dfaStateId, symId, new ReduceAction(lnum, reducecount, prodid));
    }

    private _addAction(dfaStateId: number, symId: number, action: Action): this {
        const row = this._initRow(dfaStateId);
        let acts = row.get(symId);
        if (!acts) row.set(symId, [action]);
        else {
            acts.push(action);
            this._markAmbiguousCell(dfaStateId, symId);
        }
        return this;
    }

    private _markAmbiguousCell(dfaStateId: number, symId: number): this {
        if (this._ambCells.has(dfaStateId)) this._ambCells.get(dfaStateId).add(symId);
        else this._ambCells.set(dfaStateId, new Set<number>().add(symId));
        return this;
    }

    private _initRow(dfaStateId: number): Map<number, Array<Action>> {
        let ret = this._ptable.get(dfaStateId);
        if (!ret) {
            ret = new Map<number, Array<Action>>()
            this._ptable.set(dfaStateId, ret);
        }
        return ret;
    }

    parse(tokens: Array<Token>): ParseReturn {
        if (tokens.length === 0 || tokens[tokens.length - 1].symId !== 0) throw new Error("the last token must be '$', stands for the end of tokens");
        if (!this.valid) throw new Error("the grammar is not valid");
        if (this._startState == null) throw new Error("start state is not specified");

        const stack: { tnode: ParseTreeNode, state: number }[] = [{ tnode: null, state: this._startState }];
        const len = tokens.length;
        let i = 0, stackTop = 0;
        while (i < len) {
            const token = tokens[i];
            const stackItem = stack[stackTop];
            const acts = this._ptable.get(stackItem.state).get(token.symId) || [];
            if (acts.length === 0) return new ParseReturn(null, new NotAcceptableError(`input not acceptable: ${this._prodset.getSymInStr(token.symId)} at ${token.area}`));
            const act = acts[0];
            if (act instanceof ShiftAction) {
                stack[++stackTop] = { tnode: new ParseTreeTermNode(token.symId, token), state: act.toStateNum };
                ++i;
            }
            else if (act instanceof ReduceAction) {
                let newStackTop = stackTop - act.rhsLen;
                const midnode = new ParseTreeMidNode(act.nonTerminal, act.prodId, stack.slice(newStackTop + 1, stackTop + 1).map(x => x.tnode));
                const newact = this._ptable.get(stack[newStackTop].state).get(act.nonTerminal)[0];
                if (newact instanceof ShiftAction) {
                    stack[++newStackTop] = { tnode: midnode, state: newact.toStateNum };
                    stackTop = newStackTop;
                }
                else throw new Error("impossible code path, something wrong with parsing table"); //reserved code path, should be no possible here
            }
            else if (act instanceof AcceptAction) {
                if (i !== len - 1) return new ParseReturn(null, new TooManyTokensError());
                else if (stackTop !== 1) return new ParseReturn(null, new NeedMoreTokensError());
                else return new ParseReturn(<ParseTreeMidNode>stackItem.tnode);
            }
            else throw new Error("impossible code path, 2"); //reserved code path, should be no possible here
        }
        throw new Error("impossible code path, 3"); //reserved code path, should be no possible here
    }

    get valid(): boolean {
        return this._ambCells.size === 0;
    }

    // ambCells(): Set<number> {
    //     let dfastates = new Set<number>();
    //     for (let amb of this._ambCells) {
    //         dfastates.add(amb[0]);
    //     }
    //     return dfastates;
    // }

    // stringifyAmbCells(): string {
    //     let strarr = new Array<string>();
    //     for (let amb of this._ambCells) {
    //         let dfaStateId = amb[0], syms = amb[1];
    //         strarr.push("dfa state: " + dfaStateId);
    //         let row = this._ptable.get(dfaStateId);
    //         for (let symId of syms) {
    //             strarr.push("    on terminal symbol: " + this._prodset.getSymInStr(symId));
    //             for (let act of row.get(symId)) {
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

// export function itemInStr(bitem: LR0Item, symIds: Array<number>, prodset: prod.ProdSet): string {
//     let rhsIds = bitem.prod.rhsIds;
//     let arr = new Array<string>(), i = 0, len = rhsIds.length;
//     while (i <= len) {
//         if (i === bitem.dot) arr[i] = ".";
//         else if (i > bitem.dot) arr[i] = prodset.getSymInStr(rhsIds[i - 1]);
//         else arr[i] = prodset.getSymInStr(rhsIds[i]);
//         ++i;
//     }
//     return prodset.getSymInStr(bitem.prod.lnum) + " -> " + arr.join(" ") + " , LA:" + symIds.map(x => prodset.getSymInStr(x)).join(",");
// }


// PRIVATE CLASS, represent the DFA of SLR1 parser
export class LR0DFA extends DFA {
    private _lr0ItemsPack: LR0ItemsPack;
    private _dfaItemsMap: Map<number, Set<number>>;
    private _acceptableDFAState: number;

    getItemsInState(stateId: number): Array<LR0Item> {
        return [...this._dfaItemsMap.get(stateId)].map(itemId => this._lr0ItemsPack.getItem(itemId));
    }

    get lr0ItemsPack(): LR0ItemsPack { return this._lr0ItemsPack; }

    get acceptableDFAState(): number { return this._acceptableDFAState; }

    constructor(prodset: ProdSet) {
        //number of item, is the number of NFA
        const lr0ItemsPack = new LR0ItemsPack(prodset);
        const nfsTrans = makeLR0ItemNFA(lr0ItemsPack, prodset);
        // WHY? range(lr0ItemsPack.size)
        const dfat = createNFA(nfsTrans, lr0ItemsPack.getStartItemIds(), range(lr0ItemsPack.size)).getDFATrans();

        super(dfat.dfaTrans, dfat.startid, dfat.terminals);

        this._dfaItemsMap = dfat.dfa2nfaStateMap;
        this._lr0ItemsPack = lr0ItemsPack;

        const startProds = prodset.getProds(prodset.getSymId(ProdSet.reservedStartNonTerminal));
        if (startProds.length !== 1) throw new Error(`defensive code, only one start production from: ${ProdSet.reservedStartNonTerminal} should be`);

        const startProdLR0Items = lr0ItemsPack.getItemIdsByProdId(startProds[0]);
        if (startProdLR0Items.length !== 2) throw new Error(`defensive code, only two start production LR0 items from: ${ProdSet.reservedStartNonTerminal} should be`);

        const startDFA = dfat.nfa2dfaStateMap.get(startProdLR0Items[1]);
        if (!startDFA || startDFA.size !== 1) throw new Error("defensive code, DFA state not found or more than 1");
        
        this._acceptableDFAState = [...startDFA][0];
    }
}

function makeLR0ItemNFA(lr0ItemsPack: LR0ItemsPack, prodset: ProdSet): automata.Transition[] {
    const nfaTrans: automata.Transition[] = [];

    for (let prodid of prodset.getProdIds()) {
        const prod = prodset.getProdRef(prodid);
        const itemIdArr = lr0ItemsPack.getItemIdsByProdId(prodid);
        for (let i = 0; i < prod.rhsIds.length; ++i) {
            const rnum = prod.rhsIds[i];
            const curitem = itemIdArr[i];
            const rsymstr = prodset.getSymInStr(rnum);
            nfaTrans.push(new automata.Transition(curitem, itemIdArr[i + 1], rsymstr));
            if (!prodset.isSymIdTerminal(rnum)) {
                for (let prodId2 of prodset.getProds(rnum)) {
                    nfaTrans.push(new automata.Transition(curitem, lr0ItemsPack.getItemIdsByProdId(prodId2)[0], ""));
                }
            }
        }
    }

    return nfaTrans;
}
