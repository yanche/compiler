
import * as prod from '../../productions';
import * as utility from '../../utility';
import * as dfa from '../../DFA';
import * as nfa from '../../NFA';
import * as _ from 'lodash';
import * as putil from './util';


export default class LR1Parser extends putil.LRParser {
    //private _numbitemmap: Array<putil.LR0Item>;
    private _dfaitemmap: Map<number, Set<number>>;
    //private _allitems: Set<number>;
    private _ctlookaheadsym: number;
    private _dfa: dfa.DFA;
    private _lr0itemdef: putil.LR0ItemsDef;

    constructor(prodset: prod.ProdSet) {
        super(prodset);
        let processeditems = new Set<number>(), terminals = prodset.getTerminals(), nfatrans = new Array<utility.automata.Transition>();
        let ctlookaheadsym = terminals.length + 1, firstsets = prodset.firstSet(), nullableterminals = prodset.nullableNonTerminals();

        //number of item, is the number of NFA
        let lr0itemdef = new putil.LR0ItemsDef(prodset);;

        let itemqueue = lr0itemdef.getStartItemNums().map(x => { let itemnum = x * ctlookaheadsym; processeditems.add(itemnum); return itemnum; }); //start items
        let startitems = new Array<number>().concat(itemqueue);
        while (itemqueue.length > 0) {
            let itemnum = itemqueue.pop();
            let lr0itemnum = Math.floor(itemnum / ctlookaheadsym), lasymnum = itemnum % ctlookaheadsym; //symnum: the lookahead symbol of item of LR(1)
            let lr0item = lr0itemdef.getItem(lr0itemnum);
            let rnums = lr0item.prod.rnums;
            if (lr0item.dot < rnums.length) {
                let dotsym = rnums[lr0item.dot];
                addNFATran(new utility.automata.Transition(itemnum, lr0itemdef.getItemNumsByProdId(lr0item.prodid)[lr0item.dot + 1] * ctlookaheadsym + lasymnum, prodset.getSymInStr(dotsym)), nfatrans, itemqueue, processeditems);
                if (!prodset.isSymNumTerminal(dotsym)) {
                    let firsts = new Set<number>(), dot = lr0item.dot + 1, gonull = true;
                    while (dot < rnums.length && gonull) {
                        let rnum = rnums[dot++];
                        for (let f of firstsets[rnum]) firsts.add(f);
                        gonull = nullableterminals.has(rnum);
                    }
                    if (gonull) firsts.add(lasymnum);
                    for (let prodid of prodset.getProds(dotsym)) {
                        let lr0itemid = lr0itemdef.getItemNumsByProdId(prodid)[0];
                        for (let f of firsts)
                            addNFATran(new utility.automata.Transition(itemnum, lr0itemid * ctlookaheadsym + f, ''), nfatrans, itemqueue, processeditems);
                    }
                }
            }
        }

        //this._allitems = processeditems;
        let dfaret = nfa.createNFA(nfatrans, startitems, processeditems).toDFA();
        this._dfa = dfaret.dfa;
        this._dfaitemmap = dfaret.statemap;
        this._ctlookaheadsym = ctlookaheadsym;
        this._lr0itemdef = lr0itemdef;
        this._parsetable = new putil.LRParseTable(prodset);

        //construct parsing table SLR(1)
        this._parsetable.startState = this._dfa.getStartState();
        this._parsetable.addAcceptAction(this._dfa.getStartState(), prodset.getStartNonTerminal());
        for (let dstate of dfaret.statemap) {
            let dfanum = dstate[0], lr1itemnums = dstate[1];
            this._parsetable.addShiftAction(dfanum, [...this._dfa.getTransitionMap(dfanum)].map(x => [prodset.getSymNum(x[0]), x[1]]));
            for (let lr1itemnum of lr1itemnums) {
                //state number of NFA is the number of item
                let lr0item = lr0itemdef.getItem(Math.floor(lr1itemnum / ctlookaheadsym));
                if (lr0item.dot === lr0item.prod.rnums.length) {
                    //reduce item
                    this._parsetable.addReduceAction(dfanum, lr1itemnum % ctlookaheadsym, lr0item.prod.lnum, lr0item.dot, lr0item.prodid);
                }
            }
        }
    }
    stringifyDFA(): string {
        let strarr = ['DFA:', this._dfa.stringify()];
        for (let dstate of this._dfaitemmap) {
            strarr.push(this.stringify1DFA(dstate[0]));
        }
        return strarr.join('\r\n');
    }
    stringify1DFA(dfastatenum: number): string {
        let lr1itemnums = this._dfaitemmap.get(dfastatenum);
        let strarr = ['DFA state ' + dfastatenum + ' contains items: '];
        let map = new Map<number, Array<number>>();
        for (let lr1itemnum of lr1itemnums) {
            let lr0itemnum = Math.floor(lr1itemnum / this._ctlookaheadsym), lasymnum = lr1itemnum % this._ctlookaheadsym;
            if (map.has(lr0itemnum)) map.get(lr0itemnum).push(lasymnum);
            else map.set(lr0itemnum, [lasymnum]);
        }
        for (let n of map) {
            strarr.push(putil.itemInStr(this._lr0itemdef.getItem(n[0]), n[1], this._prodset));
        }
        return strarr.join('\r\n');
    }
}

function addNFATran(tran: utility.automata.Transition, trans: Array<utility.automata.Transition>, itemqueue: Array<number>, processeditems: Set<number>) {
    trans.push(tran);
    if (!processeditems.has(tran.tgt)) {
        processeditems.add(tran.tgt);
        itemqueue.push(tran.tgt);
    }
}
