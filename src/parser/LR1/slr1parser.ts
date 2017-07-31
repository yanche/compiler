
import * as prod from "../../productions";
import * as utility from "../../utility";
import * as dfa from "../../DFA";
import * as nfa from "../../NFA";
import * as _ from "lodash";
import { LR0DFA, LRParser } from "./util";
import * as stm from "stream";


// function itemInStr(item: LR0Item, prodset: prod.ProdSet): string {
//     let rnums = item.prod.rnums;
//     let arr = new Array<string>(), i = 0, len = rnums.length;
//     while (i <= len) {
//         if (i === item.dot) arr[i] = ".";
//         else if (i > item.dot) arr[i] = prodset.getSymInStr(rnums[i - 1]);
//         else arr[i] = prodset.getSymInStr(rnums[i]);
//         ++i;
//     }
//     return prodset.getSymInStr(item.prod.lnum) + " -> " + arr.join(" ");
// }

export default class SLR1Parser extends LRParser {
    private _isLR0: boolean;
    private _lr0dfa: LR0DFA;

    constructor(prodset: prod.ProdSet) {
        super(prodset);
        this._lr0dfa = new LR0DFA(prodset);
        let followsets = prodset.followSet(), startnontnum = prodset.getStartNonTerminal();
        this._isLR0 = true;
        //construct parsing table SLR(1)
        this._startstate = this._lr0dfa.getStartState();
        this.addAcceptAction(this._lr0dfa.acceptableDFAState, prodset.getSymNum("$"));
        for (let dfanum of this._lr0dfa.getStateNums()) {
            for (let tran of this._lr0dfa.getTransitionMap(dfanum)) {
                this.addShiftAction(dfanum, prodset.getSymNum(tran[0]), tran[1]);
            }
            let hasreducemove = false;
            let dfaitems = this._lr0dfa.getItemsInState(dfanum);
            for (let item of dfaitems) {
                //state number of NFA is the number of item
                if (item.dot === item.prod.rnums.length && item.prod.lnum !== startnontnum) {
                    hasreducemove = true;
                    for (let f of followsets[item.prod.lnum])
                        this.addReduceAction(dfanum, f, item.prod.lnum, item.dot, item.prodid);
                }
            }
            if (this._isLR0 && hasreducemove && dfaitems.length > 1)
                this._isLR0 = false;
        }
    }

    isLR0Grammar(): boolean { return this._isLR0; }

    // stringifyDFA(): string {
    //     let strarr = ["DFA:", this._lr0dfa.toString()];
    //     for (let dfanum of this._lr0dfa.getStateNums()) {
    //         strarr.push(this.stringify1DFA(dfanum));
    //     }
    //     return strarr.join("\r\n");
    // }

    // stringify1DFA(dfastatenum: number): string {
    //     let strarr = ["DFA state " + dfastatenum + " contains items: "];
    //     for (let item of this._lr0dfa.getItemsInState(dfastatenum)) {
    //         strarr.push(itemInStr(item, this._prodset));
    //     }
    //     return strarr.join("\r\n");
    // }
}
