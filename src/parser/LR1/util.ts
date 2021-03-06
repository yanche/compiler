
import { ProdSet, ProductionRef } from "../../productions";
import { DFA, createNFA, Transition } from "../../automata";
import { ParseReturn, ParseTreeMidNode, ParseTreeTermNode, ParseTreeNode, Parser, Area, noArea, LexError } from "../../compile";
import { range, createTableBuilderOfArray, TableBuilder, MapBuilder, createMapBuilderOfSet, ProductionId, LR0ItemId, SymbolId, StateId, LR1ItemId } from "../../utility";
import { NeedMoreTokensError, NotAcceptableError, createParseErrorReturn } from "../error";
import { LexIterator } from "../../compile/lex";

export interface LR0Item {
    readonly prodId: ProductionId;
    readonly dot: number;
    readonly prod: ProductionRef;
    readonly itemId: LR0ItemId;
}

export class LR0ItemsPack {
    private readonly _prodItemsMap: ReadonlyArray<ReadonlyArray<LR0ItemId>>;
    private readonly _idItemMap: ReadonlyArray<LR0Item>;

    public readonly startItemIds: ReadonlyArray<LR0ItemId>;

    public get size(): number { return this._idItemMap.length; }

    public getItemIdsByProdId(prodId: ProductionId): ReadonlyArray<LR0ItemId> { return this._prodItemsMap[prodId]; }

    public getItem(lr0ItemId: LR0ItemId): LR0Item { return this._idItemMap[lr0ItemId]; }

    constructor(prodset: ProdSet) {
        const prodIds = prodset.prodIds;
        const prodItemsMap = new Array<LR0ItemId[]>(prodIds.length);
        const idItemMap: LR0Item[] = [];

        //prodid from 0 -> prodsize - 1
        //build the item id mapping
        for (const prodId of prodIds) {
            const prod = prodset.getProdRef(prodId);
            const itemArr = new Array<LR0ItemId>(prod.rhsIds.length + 1);
            for (let i = 0; i <= prod.rhsIds.length; ++i) {
                const itemId = idItemMap.length;
                itemArr[i] = itemId;
                idItemMap.push({ prodId: prodId, dot: i, prod: prod, itemId: itemId });
            }
            prodItemsMap[prodId] = itemArr;
        }

        this._prodItemsMap = prodItemsMap;
        this._idItemMap = idItemMap;
        this.startItemIds = prodset.getProds(prodset.startNonTerminalId).map(p => prodItemsMap[p][0]);
    }
}

export abstract class LRParser extends Parser {
    // parsing table
    private readonly _ptable: TableBuilder<StateId, SymbolId, Action[]>;
    private readonly _ambCells: MapBuilder<StateId, Set<SymbolId>>;

    protected abstract readonly _startState: StateId;

    constructor(prodset: ProdSet) {
        super(prodset);
        this._ptable = createTableBuilderOfArray<StateId, SymbolId, Action>();;
        this._ambCells = createMapBuilderOfSet<StateId, SymbolId>();;
    }

    // stringifyAmbCells(): string {
    //     const strarr = [this._parsetable.stringifyAmbCells(), "", ""];
    //     const dfastatestoprint = this._parsetable.ambCells();
    //     for (const d of dfastatestoprint)
    //         strarr.push(this.stringify1DFA(d));
    //     return strarr.join("\r\n");
    // }

    // abstract stringifyDFA(): string;
    // abstract stringify1DFA(dfaStateId: number): string;

    // get startState(): number { return this._startState; }
    // set startState(val: number) { this._startState = val; }

    public get valid(): boolean {
        return this._ambCells.size === 0;
    }

    public parse(lexIterator: LexIterator): ParseReturn {
        if (!this.valid) throw new Error("the grammar is not valid");
        if (this._startState === null || this._startState === undefined) throw new Error("start state is not specified");
        if (lexIterator.cur instanceof LexError) return createParseErrorReturn(lexIterator.cur);

        const stack: { tnode: ParseTreeNode, state: StateId }[] = [{ tnode: undefined!, state: this._startState }];
        let stackTop = 0;
        while (!lexIterator.done) {
            const curToken = lexIterator.cur;
            if (curToken instanceof LexError) return createParseErrorReturn(curToken);
            const stackItem = stack[stackTop];
            const { action, errReturn } = this._getSingleAct(stackItem.state, curToken.symId, curToken.area);
            if (errReturn) return errReturn;
            if (action instanceof ShiftAction) {
                stack[++stackTop] = { tnode: new ParseTreeTermNode(curToken.symId, curToken), state: action.toStateId };
                lexIterator.next();
            }
            else if (action instanceof ReduceAction) {
                let newStackTop = stackTop - action.rhsLen;
                const midnode = new ParseTreeMidNode(action.nonTerminal, action.prodId, stack.slice(newStackTop + 1, stackTop + 1).map(x => x.tnode));
                const { action: newAct, errReturn: errReturn2 } = this._getSingleAct(stack[newStackTop].state, action.nonTerminal, noArea);
                if (errReturn2) return errReturn2;
                if (newAct instanceof ShiftAction) {
                    stack[++newStackTop] = { tnode: midnode, state: newAct.toStateId };
                    stackTop = newStackTop;
                }
                else throw new Error("something wrong with parsing table, by taking a non-terminal symbol state should always shift in");
            }
            else if (action instanceof AcceptAction) {
                if (stackTop !== 1) return createParseErrorReturn(new NeedMoreTokensError());
                else return new ParseReturn(<ParseTreeMidNode>stackItem.tnode);
            }
            else throw new Error("impossible code path, 2");
        }
        throw new Error("impossible code path, 3");
    }

    protected addAcceptAction(dfaStateId: StateId, symId: SymbolId): this {
        if (symId !== this._prodset.finSymId) {
            throw new Error(`LR accept action must be $ as the terminal symbol`);
        }
        return this._addAction(dfaStateId, symId, new AcceptAction());
    }

    protected addShiftAction(dfaStateId: StateId, symId: SymbolId, toDFAStateId: StateId): this {
        return this._addAction(dfaStateId, symId, new ShiftAction(toDFAStateId));
    }

    protected addReduceAction(dfaStateId: StateId, symId: SymbolId, lhsId: SymbolId, reduceCount: number, prodId: ProductionId): this {
        return this._addAction(dfaStateId, symId, new ReduceAction(lhsId, reduceCount, prodId));
    }

    private _addAction(dfaStateId: StateId, symId: SymbolId, action: Action): this {
        const cell = this._ptable.getCell(dfaStateId, symId);
        if (cell.every(c => !c.equivalent(action))) {
            if (cell.length > 0) {
                this._ambCells.get(dfaStateId).add(symId);
            }
            cell.push(action);
        }
        return this;
    }

    private _getSingleAct(stateId: StateId, symId: SymbolId, area: Area): { action?: Action, errReturn?: ParseReturn } {
        const acts = this._ptable.getCell(stateId, symId);
        const tokenSymStr = this._prodset.getSymInStr(symId);
        if (acts.length === 0) return { errReturn: createParseErrorReturn(new NotAcceptableError(`input not acceptable, state: ${stateId}, token: ${tokenSymStr} at ${area}`)) };
        else if (acts.length > 1) throw new Error(`defensive code, more than 1 actions are found for state: ${stateId}, ${tokenSymStr}`);
        return { action: acts[0] };
    }

    // ambCells(): Set<number> {
    //     const dfastates = new Set<number>();
    //     for (const amb of this._ambCells) {
    //         dfastates.add(amb[0]);
    //     }
    //     return dfastates;
    // }

    // stringifyAmbCells(): string {
    //     const strarr = new Array<string>();
    //     for (const amb of this._ambCells) {
    //         const dfaStateId = amb[0], syms = amb[1];
    //         strarr.push("dfa state: " + dfaStateId);
    //         const row = this._ptable.get(dfaStateId);
    //         for (const symId of syms) {
    //             strarr.push("    on terminal symbol: " + this._prodset.getSymInStr(symId));
    //             for (const act of row.get(symId)) {
    //                 if (act instanceof AcceptAction) {
    //                     strarr.push("        accept");
    //                 }
    //                 else if (act instanceof ShiftAction) {
    //                     strarr.push("        shift to dfa-state: " + act.toStateId);
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

// export function itemInStr(bitem: LR0Item, symIds: number[], prodset: prod.ProdSet): string {
//     const rhsIds = bitem.prod.rhsIds;
//     const arr = new Array<string>(), i = 0, len = rhsIds.length;
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
    private readonly _dfaItemsMap: ReadonlyMap<StateId, ReadonlySet<LR0ItemId>>;

    public readonly lr0ItemsPack: LR0ItemsPack;
    public readonly acceptableDFAState: StateId;

    public getItemsInState(stateId: StateId): LR0Item[] {
        if (this._dfaItemsMap.has(stateId)) {
            return [...this._dfaItemsMap.get(stateId)!].map(itemId => this.lr0ItemsPack.getItem(itemId));
        } else {
            throw new Error(`state not found: ${stateId}`);
        }
    }

    constructor(prodset: ProdSet) {
        //number of item, is the number of NFA
        const lr0ItemsPack = new LR0ItemsPack(prodset);
        const nfsTrans = makeLR0ItemNFA(lr0ItemsPack, prodset);
        // WHY? range(lr0ItemsPack.size)
        const dfat = createNFA(nfsTrans, lr0ItemsPack.startItemIds, range(lr0ItemsPack.size)).getDFATrans();

        super(dfat.dfaTrans, dfat.dfaStartId, dfat.dfaTerminalStateIds);

        this._dfaItemsMap = dfat.dfa2nfaStateMap;
        this.lr0ItemsPack = lr0ItemsPack;

        const startProds = prodset.getProds(prodset.getSymId(ProdSet.reservedStartNonTerminal));
        if (startProds.length !== 1) throw new Error(`defensive code, only one start production from: ${ProdSet.reservedStartNonTerminal} should be`);

        const startProdLR0Items = lr0ItemsPack.getItemIdsByProdId(startProds[0]);
        if (startProdLR0Items.length !== 2) throw new Error(`defensive code, only two start production LR0 items from: ${ProdSet.reservedStartNonTerminal} should be`);

        const terminalDFA = dfat.nfa2dfaStateMap.get(startProdLR0Items[1]);
        if (!terminalDFA || terminalDFA.size !== 1) throw new Error("defensive code, terminal DFA state not found or more than 1");

        this.acceptableDFAState = [...terminalDFA][0];
    }
}

function makeLR0ItemNFA(lr0ItemsPack: LR0ItemsPack, prodset: ProdSet): ReadonlyArray<Transition> {
    const nfaTrans: Transition[] = [];

    for (const prodId of prodset.prodIds) {
        const prod = prodset.getProdRef(prodId);
        const itemIdArr = lr0ItemsPack.getItemIdsByProdId(prodId);
        for (let i = 0; i < prod.rhsIds.length; ++i) {
            const rhsSymId = prod.rhsIds[i];
            const curItem = itemIdArr[i];
            const rhsSymStr = prodset.getSymInStr(rhsSymId);
            nfaTrans.push(new Transition(curItem, itemIdArr[i + 1], rhsSymStr));
            if (!prodset.isSymIdTerminal(rhsSymId)) {
                for (const prodId2 of prodset.getProds(rhsSymId)) {
                    // epsilon transition
                    nfaTrans.push(new Transition(curItem, lr0ItemsPack.getItemIdsByProdId(prodId2)[0], ""));
                }
            }
        }
    }

    return nfaTrans;
}

export function calcLR1ItemId(lr0ItemId: LR0ItemId, lookAheadSymId: SymbolId, totalLookAhead: number) {
    return lr0ItemId * totalLookAhead + lookAheadSymId;
}

export function parseLR1Item(lr1ItemId: LR1ItemId, totalLookAhead: number): { lr0ItemId: LR0ItemId; lookAheadSymId: SymbolId; } {
    const lr0ItemId = Math.floor(lr1ItemId / totalLookAhead);
    const lookAheadSymId = lr1ItemId % totalLookAhead;
    return { lr0ItemId, lookAheadSymId };
}

export function getLR0ItemByProdId(lr0ItemPack: LR0ItemsPack, prodId: ProductionId, dot: number): LR0Item {
    return lr0ItemPack.getItem(lr0ItemPack.getItemIdsByProdId(prodId)[dot]);
}

// symIds: the symbols after the next non-terminal
// for example, for this LR1 item
// N -> a . M c Q d, *
// to calculate all LR1 look-aheads for
// N -> a M . c Q d
// symIds should be [c Q d]
// lookAheadSymId should be *
export function calcLR1LookAheadSymbols(prodset: ProdSet, symIds: SymbolId[], lookAheadSymId: SymbolId): ReadonlySet<SymbolId> {
    const { nullable, firstSet } = prodset.firstSetOfSymbols(symIds);
    const nonTerminalFollowSet = new Set<SymbolId>(firstSet);
    if (nullable) nonTerminalFollowSet.add(lookAheadSymId);
    return nonTerminalFollowSet;
}

//FOR LR parse-table
abstract class Action {
    abstract equivalent(action: Action): boolean
}

class ShiftAction extends Action {
    constructor(public toStateId: StateId) {
        super();
    }

    public equivalent(action: Action): boolean {
        return action instanceof ShiftAction
            && action.toStateId === this.toStateId;
    }
}

class ReduceAction extends Action {
    constructor(public nonTerminal: SymbolId, public rhsLen: number, public prodId: ProductionId) {
        super();
    }

    public equivalent(action: Action): boolean {
        return action instanceof ReduceAction
            && action.nonTerminal === this.nonTerminal
            && action.rhsLen === this.rhsLen
            && action.prodId === this.prodId;
    }
}

class AcceptAction extends Action {
    public equivalent(action: Action): boolean {
        return action instanceof AcceptAction;
    }
}
