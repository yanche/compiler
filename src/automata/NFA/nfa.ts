
import { Closure, calcClosure, closureOfNodes, Edge, IdGen } from '../../utility';
import { Transition } from "../index";
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
    private _epsilonclosuremap: ReadonlyMap<number, Closure>;
    private _startclosure: Set<number>;

    constructor(trans: Iterable<Transition>, starts: Iterable<number>, terminals: Iterable<number>) {
        const statemap = new Map<number, State>();
        for (const tran of trans) {
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

        const epsilontrans: Array<Edge> = [];
        for (const item of statemap) {
            const statenum = item[0];
            const epset = statemap.get(statenum).getTransition('');
            if (epset === undefined) epsilontrans.push({ src: statenum, tgt: statenum }); //self loop, for closure calculation purpose
            else {
                for (const epstate of epset) epsilontrans.push({ src: statenum, tgt: epstate });
            }
        }

        const startset = new Set<number>(), terminalset = new Set<number>();
        for (const s of starts) {
            if (!statemap.has(s)) throw new Error('invalid start num: ' + s);
            startset.add(s);
        }
        if (startset.size === 0) throw new Error('no start state in NFA');
        for (const t of terminals) {
            if (!statemap.has(t)) throw new Error('invalid terminal num: ' + t);
            terminalset.add(t);
        }
        if (terminalset.size === 0) throw new Error('no terminal state in NFA');

        this._statemap = statemap;
        this._terminalset = terminalset;
        this._epsilonclosuremap = calcClosure(epsilontrans);
        this._startclosure = this.epsilonClosureOfStates(startset);
    }

    epsilonClosureOfStates(statenums: Iterable<number>) {
        return closureOfNodes(statenums, this._epsilonclosuremap);
    }

    hasTerminal(statenums: Iterable<number>): boolean {
        for (const state of statenums) {
            if (this._terminalset.has(state)) return true;
        }
        return false;
    }

    accept(strarr: Iterable<string>): boolean {
        let curstatenums = this._startclosure;
        for (const str of strarr) {
            const mstates = new Set<number>();
            for (const state of curstatenums) {
                const tset = this._statemap.get(state).getTransition(str);
                if (tset === undefined) continue;
                for (const t of tset)
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
        const dfat = this.getDFATrans();
        return { dfa: createDFA(dfat.dfaTrans, dfat.startid, dfat.terminals), dfa2nfaStateMap: dfat.dfa2nfaStateMap, nfa2dfaStateMap: dfat.nfa2dfaStateMap };
    }

    getDFATrans(): {
        dfaTrans: Array<Transition>,
        startid: number,
        terminals: Set<number>,
        dfa2nfaStateMap: Map<number, Set<number>>,
        nfa2dfaStateMap: Map<number, Set<number>>
    } {
        const dfaTrans: Array<Transition> = [], dfaIdGen = new IdGen();
        const dfastatemap = new Map<string, number>(), startid = dfaIdGen.next(), terminals = new Set<number>();
        const nfaidofstarts = statesId([...this._startclosure]), dfa2nfaStateMap = new Map<number, Set<number>>();
        dfastatemap.set(nfaidofstarts, startid);
        dfa2nfaStateMap.set(startid, this._startclosure);
        if (this.hasTerminal(this._startclosure)) terminals.add(startid);
        const queue = [{ set: this._startclosure, id: nfaidofstarts, dfaid: startid }];
        while (queue.length > 0) {
            const cur = queue.shift(), tmp = new Map<string, Set<number>>();
            for (const s of cur.set) {
                const nfastate = this._statemap.get(s);
                for (const tran of nfastate.getTransitionMap()) {
                    const str = tran[0], tgtset = tran[1];
                    if (str.length === 0) continue;
                    let chset = tmp.get(str);
                    if (chset == null) {
                        chset = new Set<number>();
                        tmp.set(str, chset);
                    }
                    for (const t of tgtset) chset.add(t);
                }
            }
            for (const m of tmp) {
                const str = m[0], tset = this.epsilonClosureOfStates(m[1]);
                const nfastatesid = statesId([...tset]);
                let dfaid: number = null;
                if (!dfastatemap.has(nfastatesid)) {
                    dfaid = dfaIdGen.next();
                    dfastatemap.set(nfastatesid, dfaid);
                    dfa2nfaStateMap.set(dfaid, tset);
                    if (this.hasTerminal(tset)) terminals.add(dfaid);
                    queue.push({ set: tset, id: nfastatesid, dfaid: dfaid });
                }
                else
                    dfaid = dfastatemap.get(nfastatesid);
                dfaTrans.push(new Transition(cur.dfaid, dfaid, str));
            }
        }
        // construct the mapping from original nfa state -> owner dfa states
        const nfa2dfaStateMap = new Map<number, Set<number>>();
        for (const item of dfa2nfaStateMap) {
            const dfastateid = item[0];
            for (const nfastateid of item[1]) {
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
