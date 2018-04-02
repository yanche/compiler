
import { ProdSet } from '../../productions';
import { LRParser, LR0ItemsPack, LR0Item, LR0DFA } from './util';


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
    // private _totalLookAheadSymbols: number;
    // private _lr0DFA: lr0DFA;
    protected _startState: number;

    constructor(prodset: ProdSet) {
        super(prodset);

        const lr0DFA = new LR0DFA(prodset);
        // TODO: optimize this map to not save all LR1 items
        const dfaStateLR1ItemMap = new Map<number, Set<number>>();
        const stack: StackItem[] = [];
        // totalLookAheadSymbols: the count of all possible look-ahead symbols, all terminal symbols plus $
        const totalLookAheadSymbols = prodset.getTerminals().length + 1;
        // we're going to build a new dfa_state_map, here is initialization
        for (let dfaId of lr0DFA.getStateNums()) {
            dfaStateLR1ItemMap.set(dfaId, new Set<number>());
        }
        const dfaStartStateId = lr0DFA.getStartState();
        const finSymId = prodset.getSymId("$");
        const startNonTerminalId = prodset.getStartNonTerminal();
        for (let prodId of prodset.getProds(startNonTerminalId)) {
            const lr0Item = getItemByProdId(lr0DFA.lr0ItemsPack, prodId, 0);
            addIntoStackIfNotProcessed(stack, stack.length, { dfaStateId: dfaStartStateId, item: lr0Item, itemFollowSymId: finSymId }, dfaStateLR1ItemMap, calcLR1ItemId(lr0Item.itemId, finSymId, totalLookAheadSymbols));
        }
        // from start DFA state, FLOW the item follow symbol into every lr0item inside DFA state
        let stackTop = stack.length - 1;
        while (stackTop >= 0) {
            const todo = stack[stackTop--];
            const rhsIds = todo.item.prod.rhsIds;
            let dot = todo.item.dot;
            if (dot === rhsIds.length) continue;
            // next item by one shift action
            const gotoLR0Item = getItemByProdId(lr0DFA.lr0ItemsPack, todo.item.prodId, dot + 1);
            const gotoLR1ItemId = calcLR1ItemId(gotoLR0Item.itemId, todo.itemFollowSymId, totalLookAheadSymbols);
            const dotSymId = rhsIds[dot];
            const gotoDFAStateId = lr0DFA.getTransitionMap(todo.dfaStateId).get(prodset.getSymInStr(dotSymId))!;
            stackTop = addIntoStackIfNotProcessed(stack, stackTop + 1, { dfaStateId: gotoDFAStateId, item: gotoLR0Item, itemFollowSymId: todo.itemFollowSymId }, dfaStateLR1ItemMap, gotoLR1ItemId);
            if (prodset.isSymIdTerminal(dotSymId)) continue;
            // produce more when encountering a non-terminal symbol
            const { nullable, firstSet } = prodset.firstSetOfSymbols(rhsIds.slice(dot + 1));
            const nonTerminalFollowSet = firstSet;
            if (nullable) nonTerminalFollowSet.add(todo.itemFollowSymId);
            for (let prodId of prodset.getProds(dotSymId)) {
                const lr0Item = getItemByProdId(lr0DFA.lr0ItemsPack, prodId, 0);
                for (let f of nonTerminalFollowSet) {
                    stackTop = addIntoStackIfNotProcessed(stack, stackTop + 1, { dfaStateId: todo.dfaStateId, item: lr0Item, itemFollowSymId: f }, dfaStateLR1ItemMap, calcLR1ItemId(lr0Item.itemId, f, totalLookAheadSymbols));
                }
            }
        }

        // this._dfaitemmap = dfaStateLR1ItemMap;
        // this._totalLookAheadSymbols = totalLookAheadSymbols;
        this._startState = dfaStartStateId;

        // construct parsing table LALR(1)
        this.addAcceptAction(lr0DFA.acceptableDFAState, finSymId);
        for (let dstate of dfaStateLR1ItemMap) {
            const dfaId = dstate[0];
            for (let tran of lr0DFA.getTransitionMap(dfaId)) {
                this.addShiftAction(dfaId, prodset.getSymId(tran[0]), tran[1]);
            }
            const lr1ItemIds = dstate[1];
            for (let n of lr1ItemIds) {
                // state number of NFA is the number of item
                const lr0ItemId = Math.floor(n / totalLookAheadSymbols);
                const lr0Item = lr0DFA.lr0ItemsPack.getItem(lr0ItemId);
                const lookAheadSymId = n % totalLookAheadSymbols;
                if (lr0Item.dot === lr0Item.prod.rhsIds.length && lr0Item.prod.lhsId !== startNonTerminalId) {
                    this.addReduceAction(dfaId, lookAheadSymId, lr0Item.prod.lhsId, lr0Item.dot, lr0Item.prodId);
                }
            }
        }
    }

    // stringifyDFA(): string {
    //     const strarr = ['DFA:', lr0DFA.toString()];
    //     for (let th of this._dfaitemmap) {
    //         strarr.push(this.stringify1DFA(th[0]));
    //     }
    //     return strarr.join('\r\n');
    // }

    // stringify1DFA(dfaStateId: number): string {
    //     const lalr1ItemIds = this._dfaitemmap.get(dfaStateId);
    //     const strarr = ['DFA state ' + dfaStateId + ' contains items: '];
    //     const map = new Map<number, Array<number>>();
    //     for (let n of lalr1ItemIds) {
    //         const lr0itemnum = Math.floor(n / this._totalLookAheadSymbols), lasymnum = n % this._totalLookAheadSymbols;
    //         if (map.has(lr0itemnum)) map.get(lr0itemnum).push(lasymnum);
    //         else map.set(lr0itemnum, [lasymnum]);
    //     }
    //     for (let n of map) {
    //         strarr.push(itemInStr(lr0DFA.lr0ItemPack.getItem(n[0]), n[1], this._prodset));
    //     }
    //     return strarr.join('\r\n');
    // }
}

function calcLR1ItemId(lr0ItemId: number, lookAheadSymId: number, totalLookAheadSymbols: number) {
    return lr0ItemId * totalLookAheadSymbols + lookAheadSymId;
}

// return new stack top (point to last element in stack)
function addIntoStackIfNotProcessed(stack: StackItem[], stackLength: number, newItem: StackItem, processedLR1Items: Map<number, Set<number>>, lr1ItemId: number): number {
    const stateProcessedItems = processedLR1Items.get(newItem.dfaStateId)!;
    if (!stateProcessedItems.has(lr1ItemId)) {
        stateProcessedItems.add(lr1ItemId);
        stack[stackLength] = newItem;
        return stackLength;
    }
    else return stackLength - 1;
}

interface StackItem {
    dfaStateId: number;
    item: LR0Item;
    // symId to reduce the item (the following symbol)
    itemFollowSymId: number;
}

function getItemByProdId(lr0ItemPack: LR0ItemsPack, prodId: number, dot: number): LR0Item {
    return lr0ItemPack.getItem(lr0ItemPack.getItemIdsByProdId(prodId)[dot]);
}
