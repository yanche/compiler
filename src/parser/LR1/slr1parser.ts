
import * as prod from "../../productions";
import { LR0DFA, LRParser } from "./util";


// function itemInStr(item: LR0Item, prodset: prod.ProdSet): string {
//     let rhsIds = item.prod.rhsIds;
//     let arr = new Array<string>(), i = 0, len = rhsIds.length;
//     while (i <= len) {
//         if (i === item.dot) arr[i] = ".";
//         else if (i > item.dot) arr[i] = prodset.getSymInStr(rhsIds[i - 1]);
//         else arr[i] = prodset.getSymInStr(rhsIds[i]);
//         ++i;
//     }
//     return prodset.getSymInStr(item.prod.lhsId) + " -> " + arr.join(" ");
// }

export default class SLR1Parser extends LRParser {
    private _isLR0: boolean;
    private _lr0dfa: LR0DFA;

    constructor(prodset: prod.ProdSet) {
        super(prodset);
        this._isLR0 = true;
        this._lr0dfa = new LR0DFA(prodset);

        const followsets = prodset.followSet();
        const startNonTerminalId = prodset.getStartNonTerminal();
        // construct parsing table SLR(1)
        this._startState = this._lr0dfa.getStartState();
        this.addAcceptAction(this._lr0dfa.acceptableDFAState, prodset.getSymId("$"));
        for (let dfaId of this._lr0dfa.getStateNums()) {
            // add shift actions
            for (let tran of this._lr0dfa.getTransitionMap(dfaId)) {
                this.addShiftAction(dfaId, prodset.getSymId(tran[0]), tran[1]);
            }
            // figure out reduce action
            let hasReduceMove = false;
            const lr0Items = this._lr0dfa.getItemsInState(dfaId);
            for (let item of lr0Items) {
                // state id of NFA is the id of item
                if (item.dot === item.prod.rhsIds.length && item.prod.lhsId !== startNonTerminalId) {
                    hasReduceMove = true;
                    for (let f of followsets[item.prod.lhsId])
                        this.addReduceAction(dfaId, f, item.prod.lhsId, item.prod.rhsIds.length, item.prodId);
                }
            }
            if (this._isLR0 && hasReduceMove && lr0Items.length > 1)
                this._isLR0 = false;
        }
    }

    isLR0Grammar(): boolean { return this._isLR0; }

    // stringifyDFA(): string {
    //     let strarr = ["DFA:", this._lr0dfa.toString()];
    //     for (let dfaId of this._lr0dfa.getStateNums()) {
    //         strarr.push(this.stringify1DFA(dfaId));
    //     }
    //     return strarr.join("\r\n");
    // }

    // stringify1DFA(dfaStateId: number): string {
    //     let strarr = ["DFA state " + dfaStateId + " contains items: "];
    //     for (let item of this._lr0dfa.getItemsInState(dfaStateId)) {
    //         strarr.push(itemInStr(item, this._prodset));
    //     }
    //     return strarr.join("\r\n");
    // }
}
