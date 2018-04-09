
import { Transition } from "../index";
import { NodeId, MapBuilder, Stack } from "../../utility";

export default class DFA {
    private readonly _stateMap: ReadonlyMap<NodeId, StateBuilder>;
    private readonly _terminalSet: ReadonlySet<NodeId>;
    private readonly _trans: Iterable<Transition>;

    public readonly stateIdList: ReadonlyArray<NodeId>;
    public readonly startState: NodeId;

    constructor(trans: Iterable<Transition>, start: NodeId, terminals: Iterable<NodeId>) {
        const stateMapBuilder = new MapBuilder<NodeId, StateBuilder>(srcStateId => new StateBuilder(srcStateId));
        for (const tran of trans) {
            const srcState = stateMapBuilder.get(tran.src);
            // init target state (if not yet)
            stateMapBuilder.get(tran.tgt);
            srcState.addTransition(tran.sym, tran.tgt);
        }
        if (stateMapBuilder.size === 0) throw new Error("empty transitions is not acceptable");
        if (!stateMapBuilder.has(start)) throw new Error(`start state number not found in transitions: ${start}`);
        const terminalSet = new Set<NodeId>();
        for (const ter of terminals) {
            if (!stateMapBuilder.has(ter)) throw new Error(`terminal state number not found in transitions: ${ter}`);
            terminalSet.add(ter);
        }
        if (terminalSet.size === 0) throw new Error("0 terminal state is not acceptable");

        this._terminalSet = terminalSet;
        this._stateMap = stateMapBuilder.complete();
        this._trans = trans;
        this.stateIdList = [...this._stateMap].map(x => x[0]);
        this.startState = start;
    }

    public getTransitionMap(stateId: NodeId): ReadonlyMap<string, NodeId> {
        if (!this._stateMap.has(stateId)) throw new Error(`state does not exist: ${stateId}`);
        return this._stateMap.get(stateId)!.getTransitionMap();
    }

    public isTerminal(stateId: NodeId): boolean {
        return this._terminalSet.has(stateId);
    }

    public accept(strArr: Iterable<string>, onFirstTerminal: boolean = false): boolean {
        let curState: number | undefined = this.startState;
        for (const str of strArr) {
            if (onFirstTerminal && this.isTerminal(curState)) return true;
            curState = this._stateMap.get(curState)!.getTransition(str);
            if (curState === undefined) return false;
        }
        return this.isTerminal(curState);
    }

    public toString(): string {
        const strarr = [`${this._stateMap.size} states in total`, `start state: ${this.startState}`, `terminal states: ${[...this._terminalSet].join(",")}`];
        for (const tran of this._trans) strarr.push(tran.toString());
        return strarr.join("\r\n");
    }

    public equivalent(dfa: DFA): boolean {
        if (this === dfa) return true;
        if (this._stateMap.size !== dfa._stateMap.size || this._terminalSet.size !== dfa._terminalSet.size) return false;
        const stateMap = new Map<NodeId, NodeId>();
        const stateSet = new Set<NodeId>();
        const stackToCheck = new Stack<NodeId>(this.startState);;
        stateMap.set(this.startState, dfa.startState);
        stateSet.add(dfa.startState);
        while (stackToCheck.size > 0) {
            const stateId1 = stackToCheck.pop()!;
            const trans1 = this._stateMap.get(stateId1)!.getTransitionMap();
            const state2 = dfa._stateMap.get(stateMap.get(stateId1)!)!;
            if (trans1.size != state2.getTransitionMap().size) return false;
            for (const tran of trans1) {
                const str = tran[0];
                const tgtStateId1 = tran[1];
                const tgtStateId2 = state2.getTransition(str);
                if (tgtStateId2 === undefined) return false;
                const mapHas = stateMap.has(tgtStateId1);
                const setHas = stateSet.has(tgtStateId2);
                if (!mapHas && !setHas) {
                    stateMap.set(tgtStateId1, tgtStateId2);
                    stateSet.add(tgtStateId2);
                    stackToCheck.push(tgtStateId1);
                }
                else if (mapHas && setHas) {
                    // not map to same node
                    if (stateMap.get(tgtStateId1)! !== tgtStateId2) return false;
                }
                else
                    return false;
            }
        }
        return true;
    }
}

class StateBuilder {
    private readonly _id: NodeId;
    private readonly _tranMap: Map<string, NodeId>;

    constructor(id: NodeId) {
        this._id = id;
        this._tranMap = new Map<string, NodeId>();
    }

    public getTransition(str: string): NodeId | undefined {
        return this._tranMap.get(str);
    }

    public getTransitionMap(): ReadonlyMap<string, NodeId> {
        return this._tranMap;
    }

    public addTransition(sym: string, state: NodeId): this {
        if (this._tranMap.has(sym)) throw new Error(`State ${this._id} already had a transition by given string: ${sym}, to ${this._tranMap.get(sym)}`);
        this._tranMap.set(sym, state);
        return this;
    }
}
