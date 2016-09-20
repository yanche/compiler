
import * as prod from 'productions';
import * as utility from 'utility';
import * as dfa from 'DFA';
import * as nfa from 'NFA';
import * as _ from 'lodash';
import * as putil from './util';

//PRIVATE CLASS, represent the DFA of SLR1 parser
export default class SLR1DFA extends dfa.DFA {
    private _lr0itemdef: putil.LR0ItemsDef;
    private _dfaitemsmap: Map<number, Set<number>>;

    getItemsInState(statenum: number): Array<putil.LR0Item> {
        return [...this._dfaitemsmap.get(statenum)].map(itemnum => this._lr0itemdef.getItem(itemnum));
    }
    get lr0ItemDef(): putil.LR0ItemsDef { return this._lr0itemdef; }
    constructor(prodset: prod.ProdSet) {
        let nfatrans = new Array<utility.automata.Transition>();

        //number of item, is the number of NFA
        let lr0itemdef = new putil.LR0ItemsDef(prodset);;

        for (let prodid of prodset.getProdIds()) {
            let prod = prodset.getProdRef(prodid), itemnumarr = lr0itemdef.getItemNumsByProdId(prodid);
            for (let i = 0; i < prod.rnums.length; ++i) {
                let rnum = prod.rnums[i], curitem = itemnumarr[i];
                let rsymstr = prodset.getSymInStr(rnum);
                nfatrans.push(new utility.automata.Transition(curitem, itemnumarr[i + 1], rsymstr));
                if (!prodset.isSymNumTerminal(rnum)) {
                    for (let prodid2 of prodset.getProds(rnum)) {
                        nfatrans.push(new utility.automata.Transition(curitem, lr0itemdef.getItemNumsByProdId(prodid2)[0], ''));
                    }
                }
            }
        }

        let dfat = nfa.createNFA(nfatrans, lr0itemdef.getStartItemNums(), _.range(lr0itemdef.size)).getDFATrans();
        super(dfat.dfaTrans, dfat.startid, dfat.terminals);
        this._dfaitemsmap = dfat.statemap;
        this._lr0itemdef = lr0itemdef;
    }
}
