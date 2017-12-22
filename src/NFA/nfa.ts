
import * as utility from '../utility';
import { createDFA, DFA } from '../DFA';

class State {
    private _id: number;
    private _tranmap: Map<string, Set<number>>;

    constructor(id: number) {
        this._id = id;
        this._tranmap = new Map<string, Set<number>>();
    }

    addTransition(sym: string, statenum: number): this {
        if (statenum === this._id && sym.length === 0) return this; //epsilon move to self, do nothing, just ignore
        if (this._tranmap.has(sym))
            this._tranmap.get(sym).add(statenum);
        else
            this._tranmap.set(sym, new Set().add(statenum));
        return this;
    }

    getTransition(sym: string): Set<number> {
        return this._tranmap.get(sym);
    }

    getTransitionMap(): Map<string, Set<number>> {
        return this._tranmap;
    }

    getId() {
        return this._id;
    }
}

export default class NFA {
    private _statemap: Map<number, State>;
    private _terminalset: Set<number>;
    private _epsilonclosuremap: Map<number, utility.closure.Closure>;
    private _startclosure: Set<number>;

    constructor(trans: Iterable<utility.automata.Transition>, starts: Iterable<number>, terminals: Iterable<number>) {
        let statemap = new Map<number, State>();
        for (let tran of trans) {
            let state = statemap.get(tran.src);
            if (!state) {
                state = new State(tran.src);
                statemap.set(tran.src, state);
            }
            if (!statemap.has(tran.tgt)) {
                statemap.set(tran.tgt, new State(tran.tgt));
            }
            state.addTransition(tran.sym, tran.tgt);
        }
        if (statemap.size === 0) throw new Error('zero state is not good for NFA');

        let epsilontrans: Array<utility.Edge> = [];
        for (let item of statemap) {
            let statenum = item[0];
            let epset = statemap.get(statenum).getTransition('');
            if (epset === undefined) epsilontrans.push({ src: statenum, tgt: statenum }); //self loop, for closure calculation purpose
            else {
                for (let epstate of epset) epsilontrans.push({ src: statenum, tgt: epstate });
            }
        }

        let startset = new Set<number>(), terminalset = new Set<number>();
        for (let s of starts) {
            if (!statemap.has(s)) throw new Error('invalid start num: ' + s);
            startset.add(s);
        }
        if (startset.size === 0) throw new Error('no start state in NFA');
        for (let t of terminals) {
            if (!statemap.has(t)) throw new Error('invalid terminal num: ' + t);
            terminalset.add(t);
        }
        if (terminalset.size === 0) throw new Error('no terminal state in NFA');

        this._statemap = statemap;
        this._terminalset = terminalset;
        this._epsilonclosuremap = utility.closure.calcClosure(epsilontrans);
        this._startclosure = this.epsilonClosureOfStates(startset);
    }

    epsilonClosureOfStates(statenums: Iterable<number>) {
        return utility.closure.closureOfNodes(statenums, this._epsilonclosuremap);
    }

    hasTerminal(statenums: Iterable<number>): boolean {
        for (let state of statenums) {
            if (this._terminalset.has(state)) return true;
        }
        return false;
    }

    accept(strarr: Iterable<string>): boolean {
        let curstatenums = this._startclosure;
        for (let str of strarr) {
            let mstates = new Set<number>();
            for (let state of curstatenums) {
                let tset = this._statemap.get(state).getTransition(str);
                if (tset === undefined) continue;
                for (let t of tset)
                    mstates.add(t);
            }
            curstatenums = this.epsilonClosureOfStates(mstates);
            if (curstatenums.size === 0) return false;
        }
        return this.hasTerminal(curstatenums);
    }

    toDFA(): {
        dfa: DFA,
        dfa2nfaStateMap: Map<number, Set<number>>;
        nfa2dfaStateMap: Map<number, Set<number>>;
    } {
        let dfat = this.getDFATrans();
        return { dfa: createDFA(dfat.dfaTrans, dfat.startid, dfat.terminals), dfa2nfaStateMap: dfat.dfa2nfaStateMap, nfa2dfaStateMap: dfat.nfa2dfaStateMap };
    }

    getDFATrans(): {
        dfaTrans: Array<utility.automata.Transition>,
        startid: number,
        terminals: Set<number>,
        dfa2nfaStateMap: Map<number, Set<number>>,
        nfa2dfaStateMap: Map<number, Set<number>>
    } {
        let dfaTrans: Array<utility.automata.Transition> = [], dfaIdGen = new utility.IdGen();
        let dfastatemap = new Map<string, number>(), startid = dfaIdGen.next(), terminals = new Set<number>();
        let nfaidofstarts = statesId([...this._startclosure]), dfa2nfaStateMap = new Map<number, Set<number>>();
        dfastatemap.set(nfaidofstarts, startid);
        dfa2nfaStateMap.set(startid, this._startclosure);
        if (this.hasTerminal(this._startclosure)) terminals.add(startid);
        let queue = [{ set: this._startclosure, id: nfaidofstarts, dfaid: startid }];
        while (queue.length > 0) {
            let cur = queue.shift(), tmp = new Map<string, Set<number>>();
            for (let s of cur.set) {
                let nfastate = this._statemap.get(s);
                for (let tran of nfastate.getTransitionMap()) {
                    let str = tran[0], tgtset = tran[1];
                    if (str.length === 0) continue;
                    let chset = tmp.get(str);
                    if (chset == null) {
                        chset = new Set<number>();
                        tmp.set(str, chset);
                    }
                    for (let t of tgtset) chset.add(t);
                }
            }
            for (let m of tmp) {
                let str = m[0], tset = this.epsilonClosureOfStates(m[1]);
                let nfastatesid = statesId([...tset]), dfaid: number = null;
                if (!dfastatemap.has(nfastatesid)) {
                    dfaid = dfaIdGen.next();
                    dfastatemap.set(nfastatesid, dfaid);
                    dfa2nfaStateMap.set(dfaid, tset);
                    if (this.hasTerminal(tset)) terminals.add(dfaid);
                    queue.push({ set: tset, id: nfastatesid, dfaid: dfaid });
                }
                else
                    dfaid = dfastatemap.get(nfastatesid);
                dfaTrans.push(new utility.automata.Transition(cur.dfaid, dfaid, str));
            }
        }
        // construct the mapping from original nfa state -> owner dfa states
        let nfa2dfaStateMap = new Map<number, Set<number>>();
        for (let item of dfa2nfaStateMap) {
            let dfastateid = item[0];
            for (let nfastateid of item[1]) {
                let dfastates = nfa2dfaStateMap.get(nfastateid);
                if (!dfastates) {
                    dfastates = new Set<number>();
                    nfa2dfaStateMap.set(nfastateid, dfastates);
                }
                dfastates.add(dfastateid);
            }
        }
        return { dfaTrans: dfaTrans, startid: startid, terminals: terminals, dfa2nfaStateMap: dfa2nfaStateMap, nfa2dfaStateMap: nfa2dfaStateMap };
    }
}

function statesId(idlist: Array<number>): string {
    return idlist.sort(function (v1, v2) { return v1 - v2; }).join(',');
};
