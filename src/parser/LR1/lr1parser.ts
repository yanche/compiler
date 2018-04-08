
import { ProdSet } from "../../productions";
import { Transition } from "../../utility";
import { createNFA } from "../../NFA";
import { LRParser, LR0ItemsPack, calcLR1ItemId, parseLR1Item, getLR0ItemByProdId, calcLR1LookAheadSymbols } from "./util";


export default class LR1Parser extends LRParser {
    // private _numbitemmap: Array<LR0Item>;
    // private _dfaitemmap: Map<number, Set<number>>;
    // private _allitems: Set<number>;
    // private _totalLookAhead: number;
    // private _dfa: dfa.DFA;
    // private _lr0ItemsPack: LR0ItemsPack;
    protected _startState: number;

    constructor(prodset: ProdSet) {
        super(prodset);
        const processedItems = new Set<number>();
        const nfaTrans: Transition[] = [];
        const totalLookAhead = prodset.getTerminals().length + 1;
        const finSymId = prodset.getSymId("$");

        // number of item, is the number of NFA
        const lr0ItemsPack = new LR0ItemsPack(prodset);
        // start items
        const startLR1Items = lr0ItemsPack.getStartItemIds().map(lr0ItemId => calcLR1ItemId(lr0ItemId, finSymId, totalLookAhead));
        for (const i of startLR1Items) processedItems.add(i);
        const lr1ItemStack = startLR1Items.concat([]);
        let stackTop = lr1ItemStack.length - 1;
        while (stackTop >= 0) {
            const lr1ItemId = lr1ItemStack[stackTop--];
            const { lr0ItemId, lookAheadSymId } = parseLR1Item(lr1ItemId, totalLookAhead);
            const lr0Item = lr0ItemsPack.getItem(lr0ItemId);
            const rhsIds = lr0Item.prod.rhsIds;
            if (lr0Item.dot < rhsIds.length) {
                const dotSymId = rhsIds[lr0Item.dot];
                const gotoLR0ItemId = getLR0ItemByProdId(lr0ItemsPack, lr0Item.prodId, lr0Item.dot + 1).itemId;
                const gotoLR1ItemId = calcLR1ItemId(gotoLR0ItemId, lookAheadSymId, totalLookAhead);
                stackTop = addNFATran(new Transition(lr1ItemId, gotoLR1ItemId, prodset.getSymInStr(dotSymId)), nfaTrans, lr1ItemStack, stackTop + 1, processedItems);
                // non-terminal, add epsilon transition
                if (!prodset.isSymIdTerminal(dotSymId)) {
                    const nonTerminalFollowSet = calcLR1LookAheadSymbols(prodset, rhsIds.slice(lr0Item.dot + 1), lookAheadSymId);
                    for (const prodId of prodset.getProds(dotSymId)) {
                        const nextProdLR0ItemId = lr0ItemsPack.getItemIdsByProdId(prodId)[0];
                        for (const f of nonTerminalFollowSet) {
                            const nextProdLR1ItemId = calcLR1ItemId(nextProdLR0ItemId, f, totalLookAhead);
                            stackTop = addNFATran(new Transition(lr1ItemId, nextProdLR1ItemId, ""), nfaTrans, lr1ItemStack, stackTop + 1, processedItems);
                        }
                    }
                }
            }
        }

        // this._allitems = processedItems;
        const dfaRet = createNFA(nfaTrans, startLR1Items, processedItems).toDFA();
        const dfa = dfaRet.dfa;
        // this._dfa = dfaret.dfa;
        // this._dfaitemmap = dfaret.statemap;
        // this._totalLookAhead = totalLookAhead;
        // this._lr0ItemsPack = lr0ItemsPack;

        //construct parsing table LR(1)
        this._startState = dfa.getStartState();

        const startNonTerminalId = prodset.getStartNonTerminal();
        const startProds = prodset.getProds(startNonTerminalId);
        if (startProds.length !== 1) throw new Error(`defensive code, only one start production from: ${ProdSet.reservedStartNonTerminal} should be`);
        const startProdLR0Items = lr0ItemsPack.getItemIdsByProdId(startProds[0]);
        if (startProdLR0Items.length !== 2) throw new Error(`defensive code, only two start production LR0 items from: ${ProdSet.reservedStartNonTerminal} should be`);
        const acceptableLR1ItemId = calcLR1ItemId(startProdLR0Items[1], finSymId, totalLookAhead);
        const acceptableDFAStates = dfaRet.nfa2dfaStateMap.get(acceptableLR1ItemId);
        if (!acceptableDFAStates || acceptableDFAStates.size !== 1) throw new Error("defensive code, DFA state not found or more than 1");
        const acceptableDFAState = [...acceptableDFAStates][0];

        this.addAcceptAction(acceptableDFAState, finSymId);
        for (const [dfaStateId, lr1ItemIds] of dfaRet.dfa2nfaStateMap) {
            for (const [tranSym, tgtDFAStateId] of dfa.getTransitionMap(dfaStateId)) {
                this.addShiftAction(dfaStateId, prodset.getSymId(tranSym), tgtDFAStateId);
            }
            for (const lr1ItemId of lr1ItemIds) {
                // state number of NFA is the number of item
                const { lr0ItemId, lookAheadSymId } = parseLR1Item(lr1ItemId, totalLookAhead);
                const lr0Item = lr0ItemsPack.getItem(lr0ItemId);
                if (lr0Item.dot === lr0Item.prod.rhsIds.length && lr0Item.prod.lhsId !== startNonTerminalId) {
                    // reduce item
                    this.addReduceAction(dfaStateId, lookAheadSymId, lr0Item.prod.lhsId, lr0Item.dot, lr0Item.prodId);
                }
            }
        }
    }
    // stringifyDFA(): string {
    //     const strarr = ["DFA:", this._dfa.toString()];
    //     for (const dstate of this._dfaitemmap) {
    //         strarr.push(this.stringify1DFA(dstate[0]));
    //     }
    //     return strarr.join("\r\n");
    // }
    // stringify1DFA(dfaStateId: number): string {
    //     const lr1itemnums = this._dfaitemmap.get(dfaStateId);
    //     const strarr = ["DFA state " + dfaStateId + " contains items: "];
    //     const map = new Map<number, Array<number>>();
    //     for (const lr1itemnum of lr1itemnums) {
    //         const lr0itemnum = Math.floor(lr1itemnum / this._totalLookAhead), lasymnum = lr1itemnum % this._totalLookAhead;
    //         if (map.has(lr0itemnum)) map.get(lr0itemnum).push(lasymnum);
    //         else map.set(lr0itemnum, [lasymnum]);
    //     }
    //     for (const n of map) {
    //         strarr.push(itemInStr(this._lr0ItemsPack.getItem(n[0]), n[1], this._prodset));
    //     }
    //     return strarr.join("\r\n");
    // }
}

// return new stack top (point to last element in stack)
function addNFATran(tran: Transition, trans: Array<Transition>, lr1ItemStack: number[], stackLength: number, processedItems: Set<number>): number {
    trans.push(tran);
    if (!processedItems.has(tran.tgt)) {
        processedItems.add(tran.tgt);
        lr1ItemStack[stackLength] = tran.tgt;
        return stackLength;
    } else {
        return stackLength - 1;
    }
}
