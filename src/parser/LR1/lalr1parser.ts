
import { ProdSet } from '../../productions';
import { LR0DFA, LRParser, LR0ItemsPack, LR0Item } from './util';


// function itemInStr(item: LR0Item, prodset: ProdSet): string {
//     let rnums = item.prod.rnums;
//     let arr = new Array<string>(), i = 0, len = rnums.length;
//     while (i <= len) {
//         if (i === item.dot) arr[i] = '.';
//         else if (i > item.dot) arr[i] = prodset.getSymInStr(rnums[i - 1]);
//         else arr[i] = prodset.getSymInStr(rnums[i]);
//         ++i;
//     }
//     return prodset.getSymInStr(item.prod.lnum) + ' -> ' + arr.join(' ');
// }

function lr1ItemNum(lr0itemnum: number, symId: number, ctlookaheadsym: number) {
    return lr0itemnum * ctlookaheadsym + symId;
}

function tryAddIntoStack(stack: Array<StackItem>, newitem: StackItem, processedlr1items: Map<number, Set<number>>, lr1itemnum: number) {
    let stateprocesseditems = processedlr1items.get(newitem.dfastate);
    if (!stateprocesseditems.has(lr1itemnum)) {
        stateprocesseditems.add(lr1itemnum);
        stack.push(newitem);
    }
}

interface StackItem {
    dfastate: number;
    item: LR0Item;
    // symId to reduce the item (the following symbol)
    symId: number;
}

function getItemByProdId(lr0ItemPack: LR0ItemsPack, prodid: number, dot: number) {
    return lr0ItemPack.getItem(lr0ItemPack.getItemIdsByProdId(prodid)[dot]);
}

export default class LALR1Parser extends LRParser {
    // private _dfaitemmap: Map<number, Set<number>>;
    // private _ctlookaheadsym: number;
    // private _lr0dfa: LR0DFA;

    constructor(prodset: ProdSet) {
        super(prodset);
        let lr0dfa = new LR0DFA(prodset);

        // ctlookaheadsym: the count of all possible look-ahead symbols, all terminal symbols plus $
        let dfastatemap = new Map<number, Set<number>>(), stack = new Array<StackItem>(), ctlookaheadsym = prodset.getTerminals().length + 1;
        let firsts = prodset.firstSet(), nullablenonterminals = prodset.nullableNonTerminals();
        //we're going to build a new dfa_state_map, here is initialization
        for (let dfanum of lr0dfa.getStateNums()) {
            dfastatemap.set(dfanum, new Set<number>());
        }
        let dfastartstate = lr0dfa.getStartState();
        let finsymnum = prodset.getSymId("$");
        let startnontnum = prodset.getStartNonTerminal();
        for (let prodid of prodset.getProds(startnontnum)) {
            let lr0item = getItemByProdId(lr0dfa.lr0ItemsPack, prodid, 0);
            tryAddIntoStack(stack, { dfastate: dfastartstate, item: lr0item, symId: finsymnum }, dfastatemap, lr1ItemNum(lr0item.itemId, 0, ctlookaheadsym));
        }
        while (stack.length > 0) {
            let todo = stack.pop();
            let rnums = todo.item.prod.rnums, dot = todo.item.dot;
            if (dot === rnums.length) continue;
            // next item by one shift action
            let goitem = getItemByProdId(lr0dfa.lr0ItemsPack, todo.item.prodId, dot + 1);
            let dotsymnum = rnums[dot], golr1itemnum = lr1ItemNum(goitem.itemId, todo.symId, ctlookaheadsym);
            let gotodfastate = lr0dfa.getTransitionMap(todo.dfastate).get(prodset.getSymInStr(dotsymnum));
            tryAddIntoStack(stack, { dfastate: gotodfastate, item: goitem, symId: todo.symId }, dfastatemap, golr1itemnum);
            if (prodset.isSymIdTerminal(dotsymnum)) continue;
            // produce more when encountering a non-terminal symbol
            let gonull = true, fset = new Set<number>();
            ++dot;
            while (gonull && dot < rnums.length) {
                let rsym = rnums[dot++];
                for (let f of firsts[rsym]) fset.add(f);
                gonull = nullablenonterminals.has(rsym);
            }
            if (gonull) fset.add(todo.symId);
            for (let prodid of prodset.getProds(dotsymnum)) {
                let lr0item = getItemByProdId(lr0dfa.lr0ItemsPack, prodid, 0);
                for (let f of fset) {
                    tryAddIntoStack(stack, { dfastate: todo.dfastate, item: lr0item, symId: f }, dfastatemap, lr1ItemNum(lr0item.itemId, f, ctlookaheadsym));
                }
            }
        }

        // this._dfaitemmap = dfastatemap;
        // this._ctlookaheadsym = ctlookaheadsym;
        this._startState = dfastartstate;

        // construct parsing table LALR(1)
        this.addAcceptAction(lr0dfa.acceptableDFAState, finsymnum);
        for (let dstate of dfastatemap) {
            let dfanum = dstate[0], lr1itemnums = dstate[1];
            for (let tran of lr0dfa.getTransitionMap(dfanum)) {
                this.addShiftAction(dfanum, prodset.getSymId(tran[0]), tran[1]);
            }
            for (let n of lr1itemnums) {
                // state number of NFA is the number of item
                let item = lr0dfa.lr0ItemsPack.getItem(Math.floor(n / ctlookaheadsym));
                if (item.dot === item.prod.rnums.length && item.prod.lnum !== startnontnum) {
                    this.addReduceAction(dfanum, n % ctlookaheadsym, item.prod.lnum, item.dot, item.prodId);
                }
            }
        }
    }

    // stringifyDFA(): string {
    //     let strarr = ['DFA:', lr0dfa.toString()];
    //     for (let th of this._dfaitemmap) {
    //         strarr.push(this.stringify1DFA(th[0]));
    //     }
    //     return strarr.join('\r\n');
    // }

    // stringify1DFA(dfaStateId: number): string {
    //     let lalr1itemnums = this._dfaitemmap.get(dfaStateId);
    //     let strarr = ['DFA state ' + dfaStateId + ' contains items: '];
    //     let map = new Map<number, Array<number>>();
    //     for (let n of lalr1itemnums) {
    //         let lr0itemnum = Math.floor(n / this._ctlookaheadsym), lasymnum = n % this._ctlookaheadsym;
    //         if (map.has(lr0itemnum)) map.get(lr0itemnum).push(lasymnum);
    //         else map.set(lr0itemnum, [lasymnum]);
    //     }
    //     for (let n of map) {
    //         strarr.push(itemInStr(lr0dfa.lr0ItemPack.getItem(n[0]), n[1], this._prodset));
    //     }
    //     return strarr.join('\r\n');
    // }
}
