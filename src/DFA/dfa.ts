
import { Transition } from "../utility";

export default class DFA {
    private _statemap: Map<number, State>;
    private _start: number;
    private _terminalset: Set<number>;
    private _trans: Iterable<Transition>;
    // private _statect: number;

    constructor(trans: Iterable<Transition>, start: number, terminals: Iterable<number>) {
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
        if (statemap.size === 0) throw new Error("empty transitions is not acceptable");
        if (!statemap.has(start)) throw new Error(`start state number not found in transitions: ${start}`);
        const terminalset = new Set<number>();
        for (const ter of terminals) {
            if (!statemap.has(ter)) throw new Error(`terminal state number not found in transitions: ${ter}`);
            terminalset.add(ter);
        }
        if (terminalset.size === 0) throw new Error("0 terminal state is not acceptable");

        this._start = start;
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
        for (const str of strarr) {
            if (onfirstterminal && this.isTerminal(curstate)) return true;
            curstate = this._statemap.get(curstate).getTransition(str);
            if (curstate === undefined) return false;
        }
        return this.isTerminal(curstate);
    }

    toString(): string {
        const strarr = [`${this._statemap.size} states in total`, `start state: ${this._start}`, `terminal states: ${[...this._terminalset].join(",")}`];
        for (const tran of this._trans) strarr.push(tran.toString());
        return strarr.join("\r\n");
    }

    equivalent(dfa: DFA): boolean {
        if (this === dfa) return true;
        if (this._statemap.size !== dfa._statemap.size || this._terminalset.size != dfa._terminalset.size) return false
        const statemap = new Map<number, number>(), stateset = new Set<number>(), queue = [this._start];
        statemap.set(this._start, dfa._start);
        stateset.add(dfa._start);
        while (queue.length > 0) {
            const statenum1 = queue.pop();
            const trans1 = this._statemap.get(statenum1).getTransitionMap();
            const state2 = dfa._statemap.get(statemap.get(statenum1));
            if (trans1.size != state2.getTransitionMap().size) return false;
            for (const tran of trans1) {
                const str = tran[0], tgtstate = tran[1];
                const tgtstate2 = state2.getTransition(str);
                if (tgtstate2 == null) return false;
                const map1has = statemap.has(tgtstate), sethas = stateset.has(tgtstate2);
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

    addTransition(sym: string, state: number): this {
        if (this._tranmap.has(sym)) throw new Error(`State ${this._id} already had a transition by given string: ${sym}, to ${this._tranmap.get(sym)}`);
        this._tranmap.set(sym, state);
        return this;
    }
}
