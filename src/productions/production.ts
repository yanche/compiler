
import { calcClosureOfOneNode, calcClosure, Closure, Edge, IdGen, range, createMapBuilderOfArray, SymbolId, ProductionId } from "../utility";

//terminal symbol or non-terminal symbol, used in productions
export class Symbol {
    public readonly terminal: boolean;
    public readonly name: string;

    constructor(terminal: boolean, name: string) {
        if (name === "$") throw new Error("$ is a reserved symbol");
        this.terminal = terminal;
        this.name = name;
    }
}

//one production, includes left-hand-side (one non-terminal symbol) and right-hand-side (a list of symbols)
export class Production {
    public readonly LHS: Symbol;
    public readonly RHS: ReadonlyArray<Symbol>;

    private readonly _literal: string;

    constructor(lhs: Symbol, rhs: ReadonlyArray<Symbol>) {
        if (lhs.terminal) throw new Error("left-hand-side of production must be non-terminal");
        this.LHS = lhs;
        this.RHS = rhs || [];
        this._literal = Production.toString(this.LHS, this.RHS);
    }

    public toString(): string { return this._literal; }

    public static toString(lhs: Symbol | string, rhs: ReadonlyArray<Symbol>) {
        let lstr: string;
        if (lhs instanceof Symbol) lstr = lhs.name;
        else lstr = lhs;
        return lstr + " -> " + rhs.map(r => r.name).join(" ");
    }
}

// private struct to present a production
export interface ProductionRef {
    readonly prod: Production;
    readonly lhsId: SymbolId;
    readonly rhsIds: ReadonlyArray<SymbolId>;
    readonly prodId: ProductionId;
}

//a group of productions, will assign an integer to each symbol, "$" takes 0, then terminals, then non-terminals
//also an integer will be assigned to each production, starts from 0
export class ProdSet {
    public static readonly reservedNonTerminalPrefix: string = "D__";
    public static readonly reservedStartNonTerminal: string = "D__START";

    // integer for start symbol
    public readonly startNonTerminalId: SymbolId;
    // list of all prod-ids
    public readonly prodIds: ReadonlyArray<ProductionId>;
    // all terminal ids
    public readonly terminals: ReadonlyArray<SymbolId>;
    // all non-terminal ids
    public readonly nonTerminals: ReadonlyArray<SymbolId>;
    // symbol id of $
    public readonly finSymId: SymbolId;

    // integer of non-terminal -> array of id of productions by it as lhs
    private readonly _nonTerminalProdMap: ReadonlyMap<SymbolId, ProductionId[]>;
    // production id -> production
    private readonly _idProdMap: ReadonlyArray<ProductionRef>;
    // integer of symbol <--> string of symbol
    private readonly _symbolIdMap: SymbolIdMap;
    // count of terminal symbols
    private readonly _terminalsCount: number;
    // count of total symbols (includes reserved start non-terminal)
    private readonly _totalSymbolCount: number;
    // count of total productions
    private readonly _prodCount: number;

    // set of integer of non-terminal symbols which could produce epsilon
    private _nullableNonTerminals: ReadonlySet<SymbolId> | undefined = undefined;
    // integer of symbol -> first set (epsilon is not included)
    private _firstSet: ReadonlySet<SymbolId>[] | undefined = undefined;
    // integer of symbol -> follow set
    private _followSet: ReadonlySet<SymbolId>[] | undefined = undefined;

    constructor(prods: Production[]) {
        // include the reserved non-terminal symbol as a start production
        prods = prods.concat(new Production(new Symbol(false, ProdSet.reservedStartNonTerminal), [prods[0].LHS]));

        const { symbolIdMap, terminalsCount, nonTerminalsCount } = makeSymbolIdMap(prods);
        const { linkToNonTerminal, idProdMap, nonTerminalProdMap } = prodProcess(prods, symbolIdMap);

        this.startNonTerminalId = symbolIdMap.getId(ProdSet.reservedStartNonTerminal);

        if (nonTerminalProdMap.size !== nonTerminalsCount) throw new Error("not all non-terminals appear at LHS");
        if (calcClosureOfOneNode(linkToNonTerminal, this.startNonTerminalId).size !== nonTerminalsCount) throw new Error("some non-terminals are unreachable from start symbol");

        this._nonTerminalProdMap = nonTerminalProdMap;
        this._idProdMap = idProdMap;
        this._symbolIdMap = symbolIdMap;
        this._terminalsCount = terminalsCount;
        this._totalSymbolCount = this._symbolIdMap.size - 1;
        this._prodCount = this._idProdMap.length;
        this.prodIds = range(this._prodCount);
        this.nonTerminals = range(this._terminalsCount + 1, this._totalSymbolCount + 1);
        this.terminals = range(1, this._terminalsCount + 1);
        this.finSymId = this.getSymId("$");
    }

    public getSymInStr(symId: SymbolId): string { return this._symbolIdMap.getSymbol(symId); }

    public getSymId(sym: string): SymbolId {
        if (!this._symbolIdMap.hasSym(sym)) {
            throw new Error(`symbol: ${sym} does not exist in production set`);
        }
        return this._symbolIdMap.getId(sym);
    }

    public isSymIdTerminal(symId: SymbolId): boolean { return symId <= this._terminalsCount; }

    public getProds(lhsSymId: SymbolId): ReadonlyArray<ProductionId> {
        if (!this._nonTerminalProdMap.has(lhsSymId)) {
            throw new Error(`given LHS symbol id does not map to productions: ${lhsSymId}`)
        }
        return this._nonTerminalProdMap.get(lhsSymId)!;
    }

    public getProdRef(prodId: ProductionId): ProductionRef {
        if (prodId >= this._idProdMap.length) {
            throw new Error(`prodId not found: ${prodId}, max: ${this._idProdMap.length - 1}`);
        }
        return this._idProdMap[prodId];
    }

    public firstSet(): ReadonlySet<SymbolId>[] {
        if (this._firstSet) return this._firstSet;

        const nullableNonTerminals = this.nullableNonTerminals();
        const retmap = new Array<Set<SymbolId>>(this._totalSymbolCount + 1);
        const edges: Edge[] = [];
        const nonTerminals = this.nonTerminals;

        for (const nont of nonTerminals) {
            retmap[nont] = new Set<SymbolId>();
            for (const prodid of this.getProds(nont)) {
                const prodref = this.getProdRef(prodid);
                let genepsilon = true, i = 0;
                while (i < prodref.rhsIds.length && genepsilon) {
                    const rnum = prodref.rhsIds[i++];
                    if (this.isSymIdTerminal(rnum)) {
                        retmap[nont].add(rnum);
                        genepsilon = false;
                    }
                    else {
                        // could have dup edge, but it's fine
                        // first set of rnum(non-terminal) is subset of first set of nont here.
                        edges.push({ src: nont, tgt: rnum });
                        genepsilon = nullableNonTerminals.has(rnum);
                    }
                }
            }
        }

        mergeClosureSet(nonTerminals, calcClosure(edges), retmap);

        for (const t of this.terminals) retmap[t] = new Set<SymbolId>().add(t);

        return this._firstSet = retmap;
    }

    public followSet(): ReadonlySet<SymbolId>[] {
        if (this._followSet) return this._followSet;

        const retmap = new Array<Set<SymbolId>>(this._totalSymbolCount + 1);
        const firstSetMap = this.firstSet();
        const nullableNonTerminals = this.nullableNonTerminals();
        const edges: Edge[] = [];
        // 0 is the id of "$"
        retmap[this.startNonTerminalId] = new Set().add(0);

        for (const nont of this.nonTerminals) {
            if (retmap[nont] == null) retmap[nont] = new Set<SymbolId>();
            for (const prodId of this.getProds(nont)) {
                const rhsIds = this.getProdRef(prodId).rhsIds;
                if (rhsIds.length === 0) continue;
                let i = 1;
                let j = 0;
                while (i < rhsIds.length) {
                    const rsymId = rhsIds[i];
                    const fset = firstSetMap[rsymId];
                    let s = j;
                    while (s < i) addRangeToArrayOfSet(retmap, rhsIds[s++], fset);
                    if (!nullableNonTerminals.has(rsymId)) j = i;
                    ++i;
                }
                while (j < i) {
                    const rnum = rhsIds[j++];
                    // follow set of LHS would be subset of last symbol(s) (if last symbol is nullable, then more than 1) in this production
                    if (rnum !== nont) edges.push({ src: rnum, tgt: nont });
                }
            }
        }

        mergeClosureSet(range(1, this._totalSymbolCount + 1), calcClosure(edges), retmap);

        return this._followSet = retmap;
    }

    public nullableNonTerminals(): ReadonlySet<SymbolId> {
        if (this._nullableNonTerminals) return this._nullableNonTerminals;

        const retset = new Set<SymbolId>();
        const nonTerminalsToProcess: SymbolId[] = [];
        const dependencyMap = createMapBuilderOfArray<SymbolId, { rhsIds: ReadonlyArray<SymbolId>, next: number, lsymId: SymbolId }>();

        for (const nont of this.nonTerminals) {
            for (const prodId of this.getProds(nont)) {
                const rhsIds = this.getProdRef(prodId).rhsIds;
                if (rhsIds.length === 0) {
                    // no right hand side, nullable
                    if (!retset.has(nont)) {
                        retset.add(nont);
                        nonTerminalsToProcess.push(nont);
                    }
                    break;
                }
                if (this.isSymIdTerminal(rhsIds[0])) continue;
                // if for symbol rhsIds[0] becomes nullable, then lsymId has a chance to become nullable
                dependencyMap.get(rhsIds[0]).push({ rhsIds: rhsIds, next: 1, lsymId: nont });
            }
        }

        while (nonTerminalsToProcess.length > 0) {
            const nullableNonT = nonTerminalsToProcess.pop()!;
            for (const dependentItem of dependencyMap.get(nullableNonT)) {
                // the non-terminal symbol of dependentItem is already marked as nullable, no further action required
                if (retset.has(dependentItem.lsymId)) continue;
                let next = dependentItem.next;
                while (next < dependentItem.rhsIds.length && retset.has(dependentItem.rhsIds[next]))++next;
                // reach the end of production, means this production can produce null, symbol at LHS is nullable
                if (next === dependentItem.rhsIds.length) {
                    retset.add(dependentItem.lsymId);
                    nonTerminalsToProcess.push(dependentItem.lsymId);
                }
                else {
                    const symId = dependentItem.rhsIds[next];
                    // if blocked by terminal symbol, never get a change to be nullable
                    if (this.isSymIdTerminal(symId)) continue;
                    // now the "able to produce nullable" depends on symbol "symId"
                    dependencyMap.get(symId).push({ rhsIds: dependentItem.rhsIds, next: next + 1, lsymId: dependentItem.lsymId });
                }
            }
        }

        return this._nullableNonTerminals = retset;
    }

    public leftFactoredProdSet(): ProdSet {
        const prods: Production[] = [];
        const idgen = new IdGen();

        for (const nont of this.nonTerminals) {
            // start non-terminal is added programmatically
            if (nont === this.startNonTerminalId) continue;
            leftFactoring(this.getSymInStr(nont), this.getProds(nont).map(p => this.getProdRef(p)).map(p => p.prod.RHS), 0, prods, idgen);
        }

        return prods.length === (this._prodCount - 1) ? this : new ProdSet(prods);
    }

    public firstSetOfSymbols(symbolIds: ReadonlyArray<SymbolId>): { firstSet: ReadonlySet<SymbolId>; nullable: boolean } {
        let nullable = true;
        let i = 0;
        const len = symbolIds.length;
        const firstSet = new Set<SymbolId>();
        const firsts = this.firstSet();
        const nullables = this.nullableNonTerminals();
        while (nullable && i < len) {
            const symId = symbolIds[i++];
            if (symId >= this._symbolIdMap.size) throw new Error(`not a valid symbol: ${symId}`);
            // firsts[symId] -> first set of symbol (symId)
            for (const fsymId of firsts[symId]) {
                firstSet.add(fsymId);
            }
            nullable = nullables.has(symId);
        }

        return { firstSet, nullable };
    }
}

function leftFactoring(lstr: string, rhsArr: ReadonlyArray<Symbol>[], lfidx: number, prods: Production[], idGen: IdGen) {
    const lfmap = createMapBuilderOfArray<string, ReadonlyArray<Symbol>>();;
    const lfset = new Set<string>();
    let gonull = false;
    for (const rsymArr of rhsArr) {
        if (rsymArr.length === lfidx) gonull = true;
        else {
            const lfname = rsymArr[lfidx].name;
            lfmap.get(lfname).push(rsymArr);
            lfset.add(lfname);
        }
    }
    const lsymbol = new Symbol(false, lstr);
    if (gonull) prods.push(new Production(lsymbol, []));
    for (const lfname of lfset) {
        const rights = lfmap.get(lfname);
        if (rights.length === 1) prods.push(new Production(lsymbol, lfidx > 0 ? rights[0].slice(lfidx) : rights[0]));
        else {
            let i = 1, lfidx0 = lfidx, anchor: string;
            lfidx -= 1;
            do {
                // any deeper left factor, we can skip this do-while loop because leftFactoring does the same thing
                // this do-while loop is just an improvement of performance
                lfidx += 1;
                i = 1;
                if (rights[0].length > lfidx + 1) {
                    anchor = rights[0][lfidx + 1].name;
                    while (i < rights.length && (rights[i].length > lfidx + 1) && rights[i][lfidx + 1].name === anchor)++i;
                }
            } while (i === rights.length)
            const newnont = ProdSet.reservedNonTerminalPrefix + idGen.next();
            prods.push(new Production(lsymbol, rights[0].slice(lfidx0, lfidx + 1).concat(new Symbol(false, newnont))));
            leftFactoring(newnont, rights, lfidx + 1, prods, idGen);
        }
    }
}

function addRangeToArrayOfSet<T>(map: Set<T>[], key: number, item: Iterable<T>) {
    let set = map[key];
    if (!set) set = map[key] = new Set<T>();
    for (const s of item) set.add(s);
}

function mergeClosureSet(symIds: Iterable<SymbolId>, closureMap: ReadonlyMap<SymbolId, Closure>, map: Set<SymbolId>[]) {
    for (const symId of symIds) {
        if (!closureMap.has(symId)) continue;
        for (const num of closureMap.get(symId)!.getNodes()) {
            if (num === symId) continue;
            const symset = map[num];
            if (!symset) continue;
            let set = map[symId];
            if (!set)
                set = map[symId] = new Set<SymbolId>();
            for (const s of symset) set.add(s);
        };
    };
}

function collectProdSymbols(prods: Iterable<Production>): {
    terminals: Set<string>;
    nonTerminals: Set<string>;
} {
    const nonTerminals = new Set<string>();
    const terminals = new Set<string>();
    for (const prod of prods) {
        // left hand side symbol must be non-terminal
        nonTerminals.add(prod.LHS.name);
        for (const sym of prod.RHS) {
            // right hand side
            (sym.terminal ? terminals : nonTerminals).add(sym.name);
        }
    }
    return { terminals, nonTerminals };
}

// $, terminals, non-terminals
function makeSymbolIdMap(prods: Production[]): {
    symbolIdMap: SymbolIdMap;
    terminalsCount: number;
    nonTerminalsCount: number;
} {
    const symbolIdMap = new SymbolIdMap();
    const { terminals, nonTerminals } = collectProdSymbols(prods);
    //0 is the end-of-input symbol
    symbolIdMap.createSymbolsIfNotYet("$");
    // terminal symbols first
    symbolIdMap.createSymbolsIfNotYet(...terminals);
    const terminalsCount = symbolIdMap.size - 1;
    // then non-terminal symbol and reserved start symbol
    symbolIdMap.createSymbolsIfNotYet(...nonTerminals);
    const nonTerminalsCount = symbolIdMap.size - 1 - terminalsCount;
    return { symbolIdMap, terminalsCount, nonTerminalsCount };
}

function prodProcess(prods: Production[], symbolIdMap: SymbolIdMap): {
    idProdMap: ProductionRef[];
    linkToNonTerminal: Edge[];
    nonTerminalProdMap: ReadonlyMap<SymbolId, ProductionId[]>;
} {
    const idProdMap: ProductionRef[] = [];
    const linkToNonTerminal: Edge[] = [];
    const nonTerminalProdMapBuilder = createMapBuilderOfArray<SymbolId, ProductionId>();
    for (const prod of prods) {
        const lhsId = symbolIdMap.getId(prod.LHS.name);
        const rhs = prod.RHS;
        const prodId = idProdMap.length;
        idProdMap.push({
            prodId: prodId,
            prod: prod,
            lhsId: lhsId,
            rhsIds: rhs.map(s => {
                const rnum = symbolIdMap.getId(s.name);
                if (!s.terminal) linkToNonTerminal.push({ src: lhsId, tgt: rnum });
                return rnum;
            })
        });
        nonTerminalProdMapBuilder.get(lhsId).push(prodId);
    }
    const nonTerminalProdMap = nonTerminalProdMapBuilder.complete();
    return { idProdMap, linkToNonTerminal, nonTerminalProdMap };
}

class SymbolIdMap {
    private _idmap: Map<string, SymbolId>;
    private _symmap: string[];

    constructor() {
        this._idmap = new Map<string, SymbolId>();
        this._symmap = [];
    }

    // id starts from 0
    public createSymbolsIfNotYet(...symbols: string[]): void {
        for (const symbol of symbols) {
            if (!this._idmap.has(symbol)) {
                const id = this._symmap.length;
                this._idmap.set(symbol, id);
                this._symmap.push(symbol);
            }
        }
    }

    public hasSym(sym: string): boolean {
        return this._idmap.has(sym);
    }

    public getId(symbol: string): number {
        if (!this._idmap.has(symbol)) {
            throw new Error(`unexpected, SymbolIdMap does not have symbol: ${symbol}`);
        }
        return this._idmap.get(symbol)!;
    }

    public getSymbol(id: number): string {
        return this._symmap[id];
    }

    public get size(): number {
        return this._symmap.length;
    }
}
