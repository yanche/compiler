
import * as prod from '../../productions';
import * as utility from '../../utility';
import * as dfa from '../../DFA';
import * as nfa from '../../NFA';
import * as _ from 'lodash';
import * as putil from './util';
import SLR1DFA from './slr1dfa';


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

function lr1ItemNum(lr0itemnum: number, symnum: number, ctlookaheadsym: number) {
    return lr0itemnum * ctlookaheadsym + symnum;
}

function tryAddIntoStack(stack: Array<stackItem>, newitem: stackItem, processedlr1items: Map<number, Set<number>>, lr1itemnum: number) {
    let stateprocesseditems = processedlr1items.get(newitem.dfastate);
    if (!stateprocesseditems.has(lr1itemnum)) {
        stateprocesseditems.add(lr1itemnum);
        stack.push(newitem);
    }
}

interface stackItem {
    dfastate: number;
    item: putil.LR0Item;
    symnum: number;
}

function getItemByProdId(lr0ItemDef: putil.LR0ItemsDef, prodid: number, dot: number) {
    return lr0ItemDef.getItem(lr0ItemDef.getItemNumsByProdId(prodid)[dot]);
}

export default class LALR1Parser extends putil.LRParser {
    private _dfaitemmap: Map<number, Set<number>>;
    private _ctlookaheadsym: number;
    private _slr1dfa: SLR1DFA;

    constructor(prodset: prod.ProdSet) {
        super(prodset);
        this._slr1dfa = new SLR1DFA(prodset);

        let dfastatemap = new Map<number, Set<number>>(), stack = new Array<stackItem>(), ctlookaheadsym = prodset.getTerminals().length + 1, firsts = prodset.firstSet(), nullablenonterminals = prodset.nullableNonTerminals();
        //we're going to build a new dfa_state_map, here is initialization
        for (let dfanum of this._slr1dfa.getStateNums()) {
            dfastatemap.set(dfanum, new Set<number>());
        }
        let dfastartstate = this._slr1dfa.getStartState();
        for (let prodid of prodset.getProds(prodset.getStartNonTerminal())) {
            let lr0item = getItemByProdId(this._slr1dfa.lr0ItemDef, prodid, 0);
            tryAddIntoStack(stack, { dfastate: dfastartstate, item: lr0item, symnum: 0 }, dfastatemap, lr1ItemNum(lr0item.itemnum, 0, ctlookaheadsym));
        }
        while (stack.length > 0) {
            let todo = stack.pop();
            let rnums = todo.item.prod.rnums, dot = todo.item.dot;
            if (dot === rnums.length) continue;
            //goto
            let goitem = getItemByProdId(this._slr1dfa.lr0ItemDef, todo.item.prodid, dot + 1);
            let dotsymnum = rnums[dot], golr1itemnum = lr1ItemNum(goitem.itemnum, todo.symnum, ctlookaheadsym);
            let gotodfastate = this._slr1dfa.getTransitionMap(todo.dfastate).get(prodset.getSymInStr(dotsymnum));
            tryAddIntoStack(stack, { dfastate: gotodfastate, item: goitem, symnum: todo.symnum }, dfastatemap, golr1itemnum);
            //produce
            if (prodset.isSymNumTerminal(dotsymnum)) continue;
            let gonull = true, fset = new Set<number>();
            ++dot;
            while (gonull && dot < rnums.length) {
                let rsym = rnums[dot++];
                for (let f of firsts[rsym]) fset.add(f);
                gonull = nullablenonterminals.has(rsym);
            }
            if (gonull) fset.add(todo.symnum);
            for (let prodid of prodset.getProds(dotsymnum)) {
                let lr0item = getItemByProdId(this._slr1dfa.lr0ItemDef, prodid, 0);
                for (let f of fset) {
                    tryAddIntoStack(stack, { dfastate: todo.dfastate, item: lr0item, symnum: f }, dfastatemap, lr1ItemNum(lr0item.itemnum, f, ctlookaheadsym));
                }
            }
        }

        this._dfaitemmap = dfastatemap;
        this._ctlookaheadsym = ctlookaheadsym;

        let parsetable = new putil.LRParseTable(prodset);
        this._parsetable = parsetable;

        //construct parsing table SLR(1)
        parsetable.startState = this._slr1dfa.getStartState();
        parsetable.addAcceptAction(this._slr1dfa.getStartState(), prodset.getStartNonTerminal());
        for (let dstate of dfastatemap) {
            let dfanum = dstate[0], lr1itemnums = dstate[1];
            parsetable.addShiftAction(dfanum, [...this._slr1dfa.getTransitionMap(dfanum)].map(x => [prodset.getSymNum(x[0]), x[1]]));
            for (let n of lr1itemnums) {
                //state number of NFA is the number of item
                let item = this._slr1dfa.lr0ItemDef.getItem(Math.floor(n / ctlookaheadsym));
                if (item.dot === item.prod.rnums.length) {
                    parsetable.addReduceAction(dfanum, n % ctlookaheadsym, item.prod.lnum, item.dot, item.prodid);
                }
            }
        }
    }
    stringifyDFA(): string {
        let strarr = ['DFA:', this._slr1dfa.toString()];
        for (let th of this._dfaitemmap) {
            strarr.push(this.stringify1DFA(th[0]));
        }
        return strarr.join('\r\n');
    }
    stringify1DFA(dfastatenum: number): string {
        let lalr1itemnums = this._dfaitemmap.get(dfastatenum);
        let strarr = ['DFA state ' + dfastatenum + ' contains items: '];
        let map = new Map<number, Array<number>>();
        for (let n of lalr1itemnums) {
            let lr0itemnum = Math.floor(n / this._ctlookaheadsym), lasymnum = n % this._ctlookaheadsym;
            if (map.has(lr0itemnum)) map.get(lr0itemnum).push(lasymnum);
            else map.set(lr0itemnum, [lasymnum]);
        }
        for (let n of map) {
            strarr.push(putil.itemInStr(this._slr1dfa.lr0ItemDef.getItem(n[0]), n[1], this._prodset));
        }
        return strarr.join('\r\n');
    }
}
