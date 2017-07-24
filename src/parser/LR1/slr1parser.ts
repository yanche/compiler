
import * as prod from '../../productions';
import * as utility from '../../utility';
import * as dfa from '../../DFA';
import * as nfa from '../../NFA';
import * as _ from 'lodash';
import * as putil from './util';
import SLR1DFA from './slr1dfa';
import * as stm from 'stream';


function itemInStr(item: putil.LR0Item, prodset: prod.ProdSet): string {
    let rnums = item.prod.rnums;
    let arr = new Array<string>(), i = 0, len = rnums.length;
    while (i <= len) {
        if (i === item.dot) arr[i] = '.';
        else if (i > item.dot) arr[i] = prodset.getSymInStr(rnums[i - 1]);
        else arr[i] = prodset.getSymInStr(rnums[i]);
        ++i;
    }
    return prodset.getSymInStr(item.prod.lnum) + ' -> ' + arr.join(' ');
}

export default class SLR1Parser extends putil.LRParser {
    private _isLR0: boolean;
    private _slr1dfa: SLR1DFA;

    constructor(prodset: prod.ProdSet) {
        super(prodset);
        this._slr1dfa = new SLR1DFA(prodset);
        this._parsetable = new putil.LRParseTable(prodset);
        let followsets = prodset.followSet(), startnontnum = prodset.getStartNonTerminal();
        this._isLR0 = true;
        //construct parsing table SLR(1)
        this._parsetable.startState = this._slr1dfa.getStartState();
        this._parsetable.addAcceptAction(this._slr1dfa.getStartState(), startnontnum);
        for (let dfanum of this._slr1dfa.getStateNums()) {
            let dfaitems = this._slr1dfa.getItemsInState(dfanum);
            this._parsetable.addShiftAction(dfanum, [...this._slr1dfa.getTransitionMap(dfanum)].map(x => [prodset.getSymNum(x[0]), x[1]]));
            let hasreducemove = false;
            for (let item of dfaitems) {
                //state number of NFA is the number of item
                if (item.dot === item.prod.rnums.length) {
                    hasreducemove = true;
                    for (let f of followsets[item.prod.lnum])
                        this._parsetable.addReduceAction(dfanum, f, item.prod.lnum, item.dot, item.prodid);
                }
            }
            if (this._isLR0 && hasreducemove && dfaitems.length > 1)
                this._isLR0 = false;
        }
    }
    isLR0Grammar(): boolean { return this._isLR0; }
    stringifyDFA(): string {
        let strarr = ['DFA:', this._slr1dfa.toString()];
        for (let dfanum of this._slr1dfa.getStateNums()) {
            strarr.push(this.stringify1DFA(dfanum));
        }
        return strarr.join('\r\n');
    }
    stringify1DFA(dfastatenum: number): string {
        let strarr = ['DFA state ' + dfastatenum + ' contains items: '];
        for (let item of this._slr1dfa.getItemsInState(dfastatenum)) {
            strarr.push(itemInStr(item, this._prodset));
        }
        return strarr.join('\r\n');
    }
}
