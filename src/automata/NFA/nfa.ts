
import { Closure, calcClosure, closureOfNodes, Edge, IdGen, NodeId, MapBuilder, Stack, createMapBuilderOfSet } from "../../utility";
import { Transition } from "../index";
import { createDFA, DFA } from "../DFA";

export default class NFA {
    private readonly _stateMap: ReadonlyMap<NodeId, NFAStateBuilder>;
    private readonly _terminalSet: ReadonlySet<NodeId>;
    private readonly _epsilonClosureMap: ReadonlyMap<NodeId, Closure>;
    private readonly _startClosure: ReadonlySet<NodeId>;

    constructor(trans: Iterable<Transition>, starts: Iterable<NodeId>, terminals: Iterable<NodeId>) {
        const stateMap = new MapBuilder<NodeId, NFAStateBuilder>(srcStateId => new NFAStateBuilder(srcStateId));
        for (const tran of trans) {
            const state = stateMap.get(tran.src);
            // init tgt node
            stateMap.get(tran.tgt)
            state.addTransition(tran.sym, tran.tgt);
        }
        if (stateMap.size === 0) throw new Error("zero state is not good for NFA");

        this._stateMap = stateMap.complete();

        const epsilonTrans: Edge[] = [];
        for (const [stateId, state] of this._stateMap) {
            if (!state.hasTransition("")) epsilonTrans.push({ src: stateId, tgt: stateId }); // self loop, for closure calculation purpose
            else {
                for (const epstate of state.getTransition("")!) {
                    epsilonTrans.push({ src: stateId, tgt: epstate });
                }
            }
        }

        const startSet = new Set<NodeId>();
        for (const s of starts) {
            if (!stateMap.has(s)) throw new Error(`invalid start num: ${s}`);
            startSet.add(s);
        }
        if (startSet.size === 0) throw new Error("no start state in NFA");

        const terminalSet = new Set<NodeId>();
        for (const t of terminals) {
            if (!stateMap.has(t)) throw new Error(`invalid terminal num: ${t}`);
            terminalSet.add(t);
        }
        if (terminalSet.size === 0) throw new Error("no terminal state in NFA");

        this._terminalSet = terminalSet;
        this._epsilonClosureMap = calcClosure(epsilonTrans);
        this._startClosure = this._epsilonClosureOfStates(startSet);
    }

    public hasTerminal(stateIds: Iterable<NodeId>): boolean {
        for (const state of stateIds) {
            if (this._terminalSet.has(state)) return true;
        }
        return false;
    }

    public accept(strArr: Iterable<string>): boolean {
        let curStateIds = this._startClosure;
        for (const str of strArr) {
            const toStateIds = new Set<NodeId>();
            for (const state of curStateIds) {
                const tset = this._stateMap.get(state)!.getTransition(str);
                if (tset === undefined) continue;
                for (const t of tset)
                    toStateIds.add(t);
            }
            curStateIds = this._epsilonClosureOfStates(toStateIds);
            if (curStateIds.size === 0) return false;
        }
        return this.hasTerminal(curStateIds);
    }

    public toDFA(): {
        readonly dfa: DFA,
        readonly dfa2nfaStateMap: ReadonlyMap<NodeId, ReadonlySet<NodeId>>;
        readonly nfa2dfaStateMap: ReadonlyMap<NodeId, ReadonlySet<NodeId>>;
    } {
        const dfat = this.getDFATrans();
        return {
            dfa: createDFA(dfat.dfaTrans, dfat.dfaStartId, dfat.dfaTerminalStateIds),
            dfa2nfaStateMap: dfat.dfa2nfaStateMap,
            nfa2dfaStateMap: dfat.nfa2dfaStateMap
        };
    }

    public getDFATrans(): {
        readonly dfaTrans: ReadonlyArray<Transition>,
        readonly dfaStartId: NodeId,
        readonly dfaTerminalStateIds: ReadonlySet<NodeId>,
        readonly dfa2nfaStateMap: ReadonlyMap<NodeId, ReadonlySet<NodeId>>,
        readonly nfa2dfaStateMap: ReadonlyMap<NodeId, ReadonlySet<NodeId>>
    } {
        const dfaTrans: Transition[] = [];
        const dfaIdGen = new IdGen();
        const dfaStartId = dfaIdGen.next();
        const nfaStartsIdStr = statesId([...this._startClosure]);
        const dfa2nfaStateMap = new Map<NodeId, ReadonlySet<NodeId>>();
        // map of (id of NFA states) to (id of DFA state)
        const dfaStateMap = new Map<string, NodeId>();
        dfaStateMap.set(nfaStartsIdStr, dfaStartId);
        dfa2nfaStateMap.set(dfaStartId, this._startClosure);
        const dfaTerminalStateIds = new Set<NodeId>();
        if (this.hasTerminal(this._startClosure)) dfaTerminalStateIds.add(dfaStartId);

        const stack = new Stack({ set: this._startClosure, dfaStateId: dfaStartId });
        while (stack.size > 0) {
            const cur = stack.pop()!;
            // the aggregated transition map of a set of NFA state
            const nfaSetTranMapBuilder = createMapBuilderOfSet<string, NodeId>();
            for (const s of cur.set) {
                const nfaState = this._stateMap.get(s)!;
                for (const [str, tgtSet] of nfaState.getTransitionMap()) {
                    if (str.length === 0) continue;
                    const chset = nfaSetTranMapBuilder.get(str);
                    for (const t of tgtSet) chset.add(t);
                }
            }
            for (const [str, tgtSet] of nfaSetTranMapBuilder.complete()) {
                const tgtSetClosure = this._epsilonClosureOfStates(tgtSet);
                const toNFAStatesId = statesId([...tgtSetClosure]);
                if (!dfaStateMap.has(toNFAStatesId)) {
                    const toDFAStateId = dfaIdGen.next();
                    dfaStateMap.set(toNFAStatesId, toDFAStateId);
                    dfa2nfaStateMap.set(toDFAStateId, tgtSetClosure);
                    if (this.hasTerminal(tgtSetClosure)) dfaTerminalStateIds.add(toDFAStateId);
                    stack.push({ set: tgtSetClosure, dfaStateId: toDFAStateId });
                }
                const dfaStateId = dfaStateMap.get(toNFAStatesId)!;
                dfaTrans.push(new Transition(cur.dfaStateId, dfaStateId, str));
            }
        }

        // construct the mapping from original nfa state -> owner dfa states
        const nfa2dfaStateMap = createMapBuilderOfSet<NodeId, NodeId>();
        for (const [dfaStateId, nfaStateIds] of dfa2nfaStateMap) {
            for (const nfaStateId of nfaStateIds) {
                nfa2dfaStateMap.get(nfaStateId).add(dfaStateId);
            }
        }

        return {
            dfaTrans: dfaTrans,
            dfaStartId: dfaStartId,
            dfaTerminalStateIds: dfaTerminalStateIds,
            dfa2nfaStateMap: dfa2nfaStateMap,
            nfa2dfaStateMap: nfa2dfaStateMap.complete()
        };
    }

    private _epsilonClosureOfStates(stateIds: Iterable<NodeId>): ReadonlySet<NodeId> {
        return closureOfNodes(stateIds, this._epsilonClosureMap);
    }
}

function statesId(idList: ReadonlyArray<NodeId>): string {
    const idListCopy = idList.concat([]);
    return idListCopy.sort((v1, v2) => v1 - v2).join(",");
};

class NFAStateBuilder {
    public readonly id: NodeId;

    private _tranMap: Map<string, Set<NodeId>>;

    constructor(id: NodeId) {
        this.id = id;
        this._tranMap = new Map<string, Set<NodeId>>();
    }

    public addTransition(sym: string, stateId: NodeId): this {
        if (stateId === this.id && sym.length === 0) return this; //epsilon move to self, do nothing, just ignore
        if (this._tranMap.has(sym))
            this._tranMap.get(sym)!.add(stateId);
        else
            this._tranMap.set(sym, new Set().add(stateId));
        return this;
    }

    public hasTransition(sym: string): boolean {
        return this._tranMap.has(sym);
    }

    public getTransition(sym: string): Set<NodeId> | undefined {
        return this._tranMap.get(sym);
    }

    public getTransitionMap(): Map<string, Set<NodeId>> {
        return this._tranMap;
    }
}
