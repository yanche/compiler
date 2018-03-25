
import { ProdSet } from "../../productions";
import { automata } from "../../utility";
import { createNFA } from "../../NFA";
import { LRParser, LR0ItemsPack } from "./util";


export default class LR1Parser extends LRParser {
    // private _numbitemmap: Array<LR0Item>;
    // private _dfaitemmap: Map<number, Set<number>>;
    // private _allitems: Set<number>;
    // private _ctlookaheadsym: number;
    // private _dfa: dfa.DFA;
    // private _lr0itemspack: LR0ItemsPack;

    constructor(prodset: ProdSet) {
        super(prodset);
        let processeditems = new Set<number>(), nfatrans = new Array<automata.Transition>();
        let ctlookaheadsym = prodset.getTerminals().length + 1, firstsets = prodset.firstSet(), nullableterminals = prodset.nullableNonTerminals();
        let finsymnum = prodset.getSymNum("$");

        //number of item, is the number of NFA
        let lr0itemspack = new LR0ItemsPack(prodset);

        let startitems = lr0itemspack.getStartItemNums().map(x => { let itemnum = x * ctlookaheadsym + finsymnum; processeditems.add(itemnum); return itemnum; }); //start items
        let itemqueue = new Array<number>().concat(startitems);
        while (itemqueue.length > 0) {
            let itemnum = itemqueue.pop();
            let lr0itemnum = Math.floor(itemnum / ctlookaheadsym), lasymnum = itemnum % ctlookaheadsym; //symnum: the lookahead symbol of item of LR(1)
            let lr0item = lr0itemspack.getItem(lr0itemnum);
            let rnums = lr0item.prod.rnums;
            if (lr0item.dot < rnums.length) {
                let dotsym = rnums[lr0item.dot];
                addNFATran(new automata.Transition(itemnum, lr0itemspack.getItemNumsByProdId(lr0item.prodid)[lr0item.dot + 1] * ctlookaheadsym + lasymnum, prodset.getSymInStr(dotsym)), nfatrans, itemqueue, processeditems);
                if (!prodset.isSymNumTerminal(dotsym)) {
                    let firsts = new Set<number>(), dot = lr0item.dot + 1, gonull = true;
                    while (dot < rnums.length && gonull) {
                        let rnum = rnums[dot++];
                        for (let f of firstsets[rnum]) firsts.add(f);
                        gonull = nullableterminals.has(rnum);
                    }
                    if (gonull) firsts.add(lasymnum);
                    for (let prodid of prodset.getProds(dotsym)) {
                        let lr0itemid = lr0itemspack.getItemNumsByProdId(prodid)[0];
                        for (let f of firsts)
                            addNFATran(new automata.Transition(itemnum, lr0itemid * ctlookaheadsym + f, ""), nfatrans, itemqueue, processeditems);
                    }
                }
            }
        }

        // this._allitems = processeditems;
        let dfaret = createNFA(nfatrans, startitems, processeditems).toDFA();
        let dfa = dfaret.dfa;
        // this._dfa = dfaret.dfa;
        // this._dfaitemmap = dfaret.statemap;
        // this._ctlookaheadsym = ctlookaheadsym;
        // this._lr0itemspack = lr0itemspack;

        //construct parsing table SLR(1)
        this._startstate = dfa.getStartState();

        const startProds = prodset.getProds(prodset.getSymNum(ProdSet.reservedStartNonTerminal));
        if (startProds.length !== 1) throw new Error(`defensive code, only one start production from: ${ProdSet.reservedStartNonTerminal} should be`);
        const startProdLR0Items = lr0itemspack.getItemNumsByProdId(startProds[0]);
        if (startProdLR0Items.length !== 2) throw new Error(`defensive code, only two start production LR0 items from: ${ProdSet.reservedStartNonTerminal} should be`);
        const startDFA = dfaret.nfa2dfaStateMap.get(startProdLR0Items[1] * ctlookaheadsym + finsymnum);
        if (!startDFA || startDFA.size !== 1) throw new Error("defensive code, DFA state not found or more than 1");
        let acceptableDFAState = [...startDFA][0];
        let startnontnum = prodset.getStartNonTerminal();

        this.addAcceptAction(acceptableDFAState, finsymnum);
        for (let dstate of dfaret.dfa2nfaStateMap) {
            let dfanum = dstate[0], lr1itemnums = dstate[1];
            for (let tran of dfa.getTransitionMap(dfanum)) {
                this.addShiftAction(dfanum, prodset.getSymNum(tran[0]), tran[1]);
            }
            for (let lr1itemnum of lr1itemnums) {
                // state number of NFA is the number of item
                let lr0item = lr0itemspack.getItem(Math.floor(lr1itemnum / ctlookaheadsym));
                if (lr0item.dot === lr0item.prod.rnums.length && lr0item.prod.lnum !== startnontnum) {
                    // reduce item
                    this.addReduceAction(dfanum, lr1itemnum % ctlookaheadsym, lr0item.prod.lnum, lr0item.dot, lr0item.prodid);
                }
            }
        }
    }
    // stringifyDFA(): string {
    //     let strarr = ["DFA:", this._dfa.toString()];
    //     for (let dstate of this._dfaitemmap) {
    //         strarr.push(this.stringify1DFA(dstate[0]));
    //     }
    //     return strarr.join("\r\n");
    // }
    // stringify1DFA(dfastatenum: number): string {
    //     let lr1itemnums = this._dfaitemmap.get(dfastatenum);
    //     let strarr = ["DFA state " + dfastatenum + " contains items: "];
    //     let map = new Map<number, Array<number>>();
    //     for (let lr1itemnum of lr1itemnums) {
    //         let lr0itemnum = Math.floor(lr1itemnum / this._ctlookaheadsym), lasymnum = lr1itemnum % this._ctlookaheadsym;
    //         if (map.has(lr0itemnum)) map.get(lr0itemnum).push(lasymnum);
    //         else map.set(lr0itemnum, [lasymnum]);
    //     }
    //     for (let n of map) {
    //         strarr.push(itemInStr(this._lr0itemspack.getItem(n[0]), n[1], this._prodset));
    //     }
    //     return strarr.join("\r\n");
    // }
}

function addNFATran(tran: automata.Transition, trans: Array<automata.Transition>, itemqueue: Array<number>, processeditems: Set<number>) {
    trans.push(tran);
    if (!processeditems.has(tran.tgt)) {
        processeditems.add(tran.tgt);
        itemqueue.push(tran.tgt);
    }
}
