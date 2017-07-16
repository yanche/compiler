
import * as utility from '../utility';
import {createDFA, DFA} from '../DFA';

class State {
    private _id: number;
    private _tranmap: Map<string, Set<number>>;
    constructor(id: number) {
        this._id = id;
        this._tranmap = new Map<string, Set<number>>();
    }
    addTransition(str: string, statenum: number): this {
        if (statenum === this._id && str.length === 0) return this; //epsilon move to self, do nothing, just ignore
        if (this._tranmap.has(str))
            this._tranmap.get(str).add(statenum);
        else
            this._tranmap.set(str, new Set().add(statenum));
        return this;
    }
    getTransition(str: string): Set<number> {
        return this._tranmap.get(str);
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
    private _startset: Set<number>;
    private _terminalset: Set<number>;
    private _epsilonclosuremap: Map<number, utility.closure.Closure>;
    private _startclosure: Set<number>;

    constructor(trans: Iterable<utility.automata.Transition>, starts: Iterable<number>, terminals: Iterable<number>) {
        let statemap = new Map<number, State>(), stateset = new Set<number>(), statect = 0;
        for (let tran of trans) {
            let state = statemap.get(tran.src);
            if (state == null) {
                state = new State(tran.src);
                statemap.set(tran.src, state);
                ++statect;
            }
            if (!statemap.has(tran.tgt)) {
                statemap.set(tran.tgt, new State(tran.tgt));
                ++statect;
            }
            state.addTransition(tran.str, tran.tgt);
            stateset.add(tran.src);
            stateset.add(tran.tgt);
        }
        if (statect === 0) throw new Error('zero state is not good for NFA');

        let epsilontrans: Array<utility.Edge> = [];
        for (let statenum of stateset) {
            let epset = statemap.get(statenum).getTransition('');
            if (epset == null) epsilontrans.push({ src: statenum, tgt: statenum }); //self loop, for closure calculation purpose
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
        this._startset = startset;
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
                if (tset == null) continue;
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
        statemap: Map<number, Set<number>>;
    } {
        let dfat = this.getDFATrans();
        return { dfa: createDFA(dfat.dfaTrans, dfat.startid, dfat.terminals), statemap: dfat.statemap };
    }
    getDFATrans(): {
        dfaTrans: Array<utility.automata.Transition>,
        startid: number,
        terminals: Set<number>,
        statemap: Map<number, Set<number>>
    } {
        let dfaTrans: Array<utility.automata.Transition> = [], dfaIdGen = new utility.IdGen();
        let dfastatemap = new Map<string, number>(), startid = dfaIdGen.next(), terminals = new Set<number>();
        let nfaidofstarts = statesId([...this._startclosure]), dfanfastatemap = new Map<number, Set<number>>();
        dfastatemap.set(nfaidofstarts, startid);
        dfanfastatemap.set(startid, this._startclosure);
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
                    dfanfastatemap.set(dfaid, tset);
                    if (this.hasTerminal(tset)) terminals.add(dfaid);
                    queue.push({ set: tset, id: nfastatesid, dfaid: dfaid });
                }
                else
                    dfaid = dfastatemap.get(nfastatesid);
                dfaTrans.push(new utility.automata.Transition(cur.dfaid, dfaid, str));
            }
        }
        return { dfaTrans: dfaTrans, startid: startid, terminals: terminals, statemap: dfanfastatemap };
    }
}

function statesId(idlist: Array<number>): string {
    return idlist.sort(function (v1, v2) { return v1 - v2; }).join(',');
};
