
import * as prod from "../../productions";
import { LR0DFA, LRParser } from "./util";
import { StateId } from "../../utility";


// function itemInStr(item: LR0Item, prodset: prod.ProdSet): string {
//     const rhsIds = item.prod.rhsIds;
//     const arr = new Array<string>(), i = 0, len = rhsIds.length;
//     while (i <= len) {
//         if (i === item.dot) arr[i] = ".";
//         else if (i > item.dot) arr[i] = prodset.getSymInStr(rhsIds[i - 1]);
//         else arr[i] = prodset.getSymInStr(rhsIds[i]);
//         ++i;
//     }
//     return prodset.getSymInStr(item.prod.lhsId) + " -> " + arr.join(" ");
// }

export default class SLR1Parser extends LRParser {
    public readonly isLR0: boolean;

    // private _lr0dfa: LR0DFA;
    protected readonly _startState: StateId;

    constructor(prodset: prod.ProdSet) {
        super(prodset);
        this.isLR0 = true;
        const lr0DFA = new LR0DFA(prodset);

        const followsets = prodset.followSet();
        const startNonTerminalId = prodset.startNonTerminalId;
        // construct parsing table SLR(1)
        this._startState = lr0DFA.startState;
        this.addAcceptAction(lr0DFA.acceptableDFAState, prodset.getSymId("$"));
        for (const dfaId of lr0DFA.stateIdList) {
            // add shift actions
            for (const tran of lr0DFA.getTransitionMap(dfaId)) {
                this.addShiftAction(dfaId, prodset.getSymId(tran[0]), tran[1]);
            }
            // figure out reduce action
            let hasReduceMove = false;
            const lr0Items = lr0DFA.getItemsInState(dfaId);
            for (const item of lr0Items) {
                // state id of NFA is the id of item
                if (item.dot === item.prod.rhsIds.length && item.prod.lhsId !== startNonTerminalId) {
                    hasReduceMove = true;
                    for (const f of followsets[item.prod.lhsId])
                        this.addReduceAction(dfaId, f, item.prod.lhsId, item.prod.rhsIds.length, item.prodId);
                }
            }
            if (this.isLR0 && hasReduceMove && lr0Items.length > 1) {
                // LR0: if state has reduce action, then it must be the only one action (thus only one item), it does not look at follow set
                this.isLR0 = false;
            }
        }
    }

    // stringifyDFA(): string {
    //     const strarr = ["DFA:", lr0DFA.toString()];
    //     for (const dfaId of lr0DFA.getStateNums()) {
    //         strarr.push(this.stringify1DFA(dfaId));
    //     }
    //     return strarr.join("\r\n");
    // }

    // stringify1DFA(dfaStateId: number): string {
    //     const strarr = ["DFA state " + dfaStateId + " contains items: "];
    //     for (const item of lr0DFA.getItemsInState(dfaStateId)) {
    //         strarr.push(itemInStr(item, this._prodset));
    //     }
    //     return strarr.join("\r\n");
    // }
}
