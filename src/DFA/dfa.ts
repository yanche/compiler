
import * as utility from '../utility';

export default class DFA {
    private _statemap: Map<number, State>;
    private _start: number;
    private _terminalset: Set<number>;
    private _trans: Iterable<utility.automata.Transition>;
    private _statect: number;

    constructor(trans: Iterable<utility.automata.Transition>, start: number, terminals: Iterable<number>) {
        let statemap = new Map<number, State>(), statect = 0;
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
        }
        if (statect === 0) throw new Error('empty transitions is not acceptable');
        if (!statemap.has(start)) throw new Error('start state number not found in transitions: ' + start);
        let terminalset = new Set<number>();
        for (let ter of terminals) {
            if (!statemap.has(ter)) throw new Error('terminal state number not found in transitions: ' + ter);
            terminalset.add(ter);
        }
        if (terminalset.size === 0) throw new Error('no terminal state is not acceptable');

        this._start = start;
        this._statect = statect;
        this._terminalset = terminalset;
        this._statemap = statemap;
        this._trans = trans;
    }
    getStateNums(): Array<number> { return [...this._statemap].map(x => x[0]); }
    getStartState(): number { return this._start; }
    getTransitionMap(statenum: number): Map<string, number> {
        return this._statemap.get(statenum).getTransitionMap();
    }
    isTerminal(statenum: number): boolean {
        return this._terminalset.has(statenum);
    }
    accept(strarr: Iterable<string>, onfirstterminal: boolean = false): boolean {
        let curstate = this._start;
        for (let str of strarr) {
            if (onfirstterminal && this.isTerminal(curstate)) return true;
            curstate = this._statemap.get(curstate).getTransition(str);
            if (curstate == null) return false;
        }
        return this.isTerminal(curstate);
    }
    stringify(): string {
        let strarr = [this._statect + ' states in total', 'start state: ' + this._start, 'terminal states: ' + [...this._terminalset].join(',')];
        for (let tran of this._trans) strarr.push(tran.stringify());
        return strarr.join('\r\n');
    }
    equivalent(dfa: DFA): boolean {
        if (this === dfa) return true;
        if (this._statect != dfa._statect || this._terminalset.size != dfa._terminalset.size) return false
        let statemap = new Map<number, number>(), stateset = new Set<number>(), queue = [this._start];
        statemap.set(this._start, dfa._start);
        stateset.add(dfa._start);
        while (queue.length > 0) {
            let statenum1 = queue.pop();
            let trans1 = this._statemap.get(statenum1).getTransitionMap();
            let state2 = dfa._statemap.get(statemap.get(statenum1));
            if (trans1.size != state2.getTransitionMap().size) return false;
            for (let tran of trans1) {
                let str = tran[0], tgtstate = tran[1];
                let tgtstate2 = state2.getTransition(str);
                if (tgtstate2 == null) return false;
                let map1has = statemap.has(tgtstate), sethas = stateset.has(tgtstate2);
                if (!map1has && !sethas) {
                    statemap.set(tgtstate, tgtstate2);
                    stateset.add(tgtstate2);
                    queue.push(tgtstate);
                }
                else if (map1has && sethas) {
                    if (statemap.get(tgtstate) != tgtstate2) return false;
                }
                else
                    return false;
            }
        }
        return true;
    }
}

class State {
    private _id: number;
    private _tranmap: Map<string, number>;
    constructor(id: number) {
        this._id = id;
        this._tranmap = new Map<string, number>();
    }
    getTransition(str: string): number {
        return this._tranmap.get(str);
    }
    getTransitionMap(): Map<string, number> {
        return this._tranmap;
    }
    addTransition(str: string, state: number): this {
        if (this._tranmap.has(str)) throw new Error('already has transition by given string: ' + str);
        this._tranmap.set(str, state);
        return this;
    }
}