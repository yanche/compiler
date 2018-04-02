
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
    // private _lr0dfa: LR0DFA;
    protected _startState: number;

    constructor(prodset: prod.ProdSet) {
        super(prodset);
        this._isLR0 = true;
        const lr0DFA = new LR0DFA(prodset);

        const followsets = prodset.followSet();
        const startNonTerminalId = prodset.getStartNonTerminal();
        // construct parsing table SLR(1)
        this._startState = lr0DFA.getStartState();
        this.addAcceptAction(lr0DFA.acceptableDFAState, prodset.getSymId("$"));
        for (let dfaId of lr0DFA.getStateNums()) {
            // add shift actions
            for (let tran of lr0DFA.getTransitionMap(dfaId)) {
                this.addShiftAction(dfaId, prodset.getSymId(tran[0]), tran[1]);
            }
            // figure out reduce action
            let hasReduceMove = false;
            const lr0Items = lr0DFA.getItemsInState(dfaId);
            for (let item of lr0Items) {
                // state id of NFA is the id of item
                if (item.dot === item.prod.rhsIds.length && item.prod.lhsId !== startNonTerminalId) {
                    hasReduceMove = true;
                    for (let f of followsets[item.prod.lhsId])
                        this.addReduceAction(dfaId, f, item.prod.lhsId, item.prod.rhsIds.length, item.prodId);
                }
            }
            if (this._isLR0 && hasReduceMove && lr0Items.length > 1) {
                // LR0: if state has reduce action, then it must be the only one action (thus only one item), it does not look at follow set
                this._isLR0 = false;
            }
        }
    }

    public get isLR0(): boolean { return this._isLR0; }

    // stringifyDFA(): string {
    //     let strarr = ["DFA:", lr0DFA.toString()];
    //     for (let dfaId of lr0DFA.getStateNums()) {
    //         strarr.push(this.stringify1DFA(dfaId));
    //     }
    //     return strarr.join("\r\n");
    // }

    // stringify1DFA(dfaStateId: number): string {
    //     let strarr = ["DFA state " + dfaStateId + " contains items: "];
    //     for (let item of lr0DFA.getItemsInState(dfaStateId)) {
    //         strarr.push(itemInStr(item, this._prodset));
    //     }
    //     return strarr.join("\r\n");
    // }
}
