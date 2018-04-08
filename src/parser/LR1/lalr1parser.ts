
import { ProdSet } from '../../productions';
import { LRParser, LR0Item, LR0DFA, calcLR1ItemId, parseLR1Item, getLR0ItemByProdId, calcLR1LookAheadSymbols } from './util';
import { createMapBuilderOfSet, MapBuilder } from "../../utility";


// function itemInStr(item: LR0Item, prodset: ProdSet): string {
//     const rhsIds = item.prod.rhsIds;
//     const arr = new Array<string>(), i = 0, len = rhsIds.length;
//     while (i <= len) {
//         if (i === item.dot) arr[i] = '.';
//         else if (i > item.dot) arr[i] = prodset.getSymInStr(rhsIds[i - 1]);
//         else arr[i] = prodset.getSymInStr(rhsIds[i]);
//         ++i;
//     }
//     return prodset.getSymInStr(item.prod.lnum) + ' -> ' + arr.join(' ');
// }

export default class LALR1Parser extends LRParser {
    // private _dfaitemmap: Map<number, Set<number>>;
    // private _totalLookAhead: number;
    // private _lr0DFA: lr0DFA;
    protected _startState: number;

    constructor(prodset: ProdSet) {
        super(prodset);

        const lr0DFA = new LR0DFA(prodset);
        // TODO: optimize this map to not save all LR1 items
        // we're going to build a new dfa_state_map, here is initialization
        const dfaStateLR1ItemMapBuilder = createMapBuilderOfSet<number, number>();
        const stack: StackItem[] = [];
        // totalLookAhead: the count of all possible look-ahead symbols, all terminal symbols plus $
        const totalLookAhead = prodset.terminals.length + 1;
        const dfaStartStateId = lr0DFA.getStartState();
        const finSymId = prodset.getSymId("$");
        const startNonTerminalId = prodset.startNonTerminalId;
        for (const prodId of prodset.getProds(startNonTerminalId)) {
            const lr0Item = getLR0ItemByProdId(lr0DFA.lr0ItemsPack, prodId, 0);
            addIntoStackIfNotProcessed(stack, stack.length, dfaStartStateId, lr0Item, finSymId, totalLookAhead, dfaStateLR1ItemMapBuilder);
        }
        // from start DFA state, FLOW the item follow symbol into every lr0item inside DFA state
        let stackTop = stack.length - 1;
        while (stackTop >= 0) {
            const todo = stack[stackTop--];
            const rhsIds = todo.lr0Item.prod.rhsIds;
            const dot = todo.lr0Item.dot;
            if (dot === rhsIds.length) continue;
            // next item by one shift action
            const gotoLR0Item = getLR0ItemByProdId(lr0DFA.lr0ItemsPack, todo.lr0Item.prodId, dot + 1);
            const dotSymId = rhsIds[dot];
            const gotoDFAStateId = lr0DFA.getTransitionMap(todo.dfaStateId).get(prodset.getSymInStr(dotSymId))!;
            stackTop = addIntoStackIfNotProcessed(stack, stackTop + 1, gotoDFAStateId, gotoLR0Item, todo.lookAheadSymId, totalLookAhead, dfaStateLR1ItemMapBuilder);
            if (prodset.isSymIdTerminal(dotSymId)) continue;
            // produce more when encountering a non-terminal symbol
            const nonTerminalFollowSet = calcLR1LookAheadSymbols(prodset, rhsIds.slice(dot + 1), todo.lookAheadSymId);
            for (const prodId of prodset.getProds(dotSymId)) {
                const lr0Item = getLR0ItemByProdId(lr0DFA.lr0ItemsPack, prodId, 0);
                for (const f of nonTerminalFollowSet) {
                    stackTop = addIntoStackIfNotProcessed(stack, stackTop + 1, todo.dfaStateId, lr0Item, f, totalLookAhead, dfaStateLR1ItemMapBuilder);
                }
            }
        }

        // this._dfaitemmap = dfaStateLR1ItemMapBuilder;
        // this._totalLookAhead = totalLookAhead;
        this._startState = dfaStartStateId;

        // construct parsing table LALR(1)
        this.addAcceptAction(lr0DFA.acceptableDFAState, finSymId);
        const dfaStateLR1ItemMap = dfaStateLR1ItemMapBuilder.complete();
        for (const [dfaStateId, lr1ItemIds] of dfaStateLR1ItemMap) {
            for (const tran of lr0DFA.getTransitionMap(dfaStateId)) {
                this.addShiftAction(dfaStateId, prodset.getSymId(tran[0]), tran[1]);
            }
            for (const lr1ItemId of lr1ItemIds) {
                // state number of NFA is the number of item
                const { lr0ItemId, lookAheadSymId } = parseLR1Item(lr1ItemId, totalLookAhead);
                const lr0Item = lr0DFA.lr0ItemsPack.getItem(lr0ItemId);
                if (lr0Item.dot === lr0Item.prod.rhsIds.length && lr0Item.prod.lhsId !== startNonTerminalId) {
                    this.addReduceAction(dfaStateId, lookAheadSymId, lr0Item.prod.lhsId, lr0Item.dot, lr0Item.prodId);
                }
            }
        }
    }

    // stringifyDFA(): string {
    //     const strarr = ['DFA:', lr0DFA.toString()];
    //     for (const th of this._dfaitemmap) {
    //         strarr.push(this.stringify1DFA(th[0]));
    //     }
    //     return strarr.join('\r\n');
    // }

    // stringify1DFA(dfaStateId: number): string {
    //     const lalr1ItemIds = this._dfaitemmap.get(dfaStateId);
    //     const strarr = ['DFA state ' + dfaStateId + ' contains items: '];
    //     const map = new Map<number, Array<number>>();
    //     for (const n of lalr1ItemIds) {
    //         const lr0itemnum = Math.floor(n / this._totalLookAhead), lasymnum = n % this._totalLookAhead;
    //         if (map.has(lr0itemnum)) map.get(lr0itemnum).push(lasymnum);
    //         else map.set(lr0itemnum, [lasymnum]);
    //     }
    //     for (const n of map) {
    //         strarr.push(itemInStr(lr0DFA.lr0ItemPack.getItem(n[0]), n[1], this._prodset));
    //     }
    //     return strarr.join('\r\n');
    // }
}

// return new stack top (point to last element in stack)
function addIntoStackIfNotProcessed(stack: StackItem[], stackLength: number, dfaStateId: number, lr0Item: LR0Item, lookAheadSymId: number, totalLookAhead: number, processedLR1Items: MapBuilder<number, Set<number>>): number {
    const lr1ItemId = calcLR1ItemId(lr0Item.itemId, lookAheadSymId, totalLookAhead);
    const stateProcessedItems = processedLR1Items.get(dfaStateId);
    if (!stateProcessedItems.has(lr1ItemId)) {
        stateProcessedItems.add(lr1ItemId);
        stack[stackLength] = {
            dfaStateId: dfaStateId,
            lr0Item: lr0Item,
            lookAheadSymId: lookAheadSymId
        };
        return stackLength;
    }
    else return stackLength - 1;
}

interface StackItem {
    dfaStateId: number;
    lr0Item: LR0Item;
    // symId to reduce the item (the following symbol)
    lookAheadSymId: number;
}
