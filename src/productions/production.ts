
import { closure, Edge, IdGen, range } from "../utility";

//terminal symbol or non-terminal symbol, used in productions
export class Symbol {
    private _terminal: boolean;
    private _name: string;

    constructor(terminal: boolean, name: string) {
        if (name === "$") throw new Error("$ is a reserved symbol");
        this._terminal = terminal;
        this._name = name;
    }

    isTerminal(): boolean { return this._terminal; }

    getName(): string { return this._name; }
}

//one production, includes left-hand-side (one non-terminal symbol) and right-hand-side (a list of symbols)
export class Production {
    private _lhs: Symbol;
    private _rhs: Symbol[];
    private _literal: string;

    constructor(lhs: Symbol, rhs: Symbol[]) {
        if (lhs.isTerminal()) throw new Error("left-hand-side of production must be non-terminal");
        this._lhs = lhs;
        this._rhs = rhs || [];
        this._literal = Production.toString(this._lhs, this._rhs);
    }

    public getLHS(): Symbol { return this._lhs; }

    public getRHS(): Symbol[] { return this._rhs; }

    public toString(): string { return this._literal; }

    public static toString(lhs: Symbol | string, rhs: Symbol[]) {
        let lstr: string;
        if (lhs instanceof Symbol) lstr = lhs.getName();
        else lstr = lhs;
        return lstr + " -> " + rhs.map(r => r.getName()).join(" ");
    }
}

// private struct to present a production
export interface ProductionRef {
    prod: Production;
    lhsId: number;
    rhsIds: number[];
    prodId: number;
}

//a group of productions, will assign an integer to each symbol, "$" takes 0, then terminals, then non-terminals
//also an integer will be assigned to each production, starts from 0
export class ProdSet {
    private _startNonTerminalId: number; //integer for start symbol
    private _nonTerminalProdMap: Map<number, Array<number>>; //integer of non-terminal -> array of id of productions by it as lhs
    private _idProdMap: Array<ProductionRef>;  //production id -> production
    private _symbolIdMap: SymbolIdMap; //integer of symbol <--> string of symbol
    private _terminalsCount: number;       //count of terminal symbols
    private _nullableNonTerminals: Set<number> | undefined = undefined; //set of integer of non-terminal symbols which could produce epsilon
    private _firstSet: Array<Set<number>> | undefined = undefined; //integer of symbol -> first set (epsilon is not included)
    private _followSet: Array<Set<number>> | undefined = undefined; //integer of symbol -> follow set

    static preservedNonTerminalPrefix: string = "D__";
    static reservedStartNonTerminal: string = "D__START";

    constructor(prods: Production[]) {
        // include the reserved non-terminal symbol as a start production
        prods = prods.concat(new Production(new Symbol(false, ProdSet.reservedStartNonTerminal), [prods[0].getLHS()]));

        const { symbolIdMap, terminalsCount, nonTerminalsCount } = makeSymbolIdMap(prods);
        const { linkToNonTerminal, idProdMap, nonTerminalProdMap } = prodProcess(prods, symbolIdMap);

        this._startNonTerminalId = symbolIdMap.getId(ProdSet.reservedStartNonTerminal);

        if (nonTerminalProdMap.size !== nonTerminalsCount) throw new Error("not all non-terminals appear at LHS");
        if (closure.calcClosureOfOneNode(linkToNonTerminal, this._startNonTerminalId).size !== nonTerminalsCount) throw new Error("some non-terminals are unreachable from start symbol");

        this._nonTerminalProdMap = nonTerminalProdMap;
        this._idProdMap = idProdMap;
        this._symbolIdMap = symbolIdMap;
        this._terminalsCount = terminalsCount;
    }

    private get _totalSymbolCount(): number {
        return this._symbolIdMap.size - 1;
    }

    private get _prodCount(): number {
        return this._idProdMap.length;
    }

    public getStartNonTerminal(): number { return this._startNonTerminalId; }

    public getNonTerminals(): Array<number> { return range(this._terminalsCount + 1, this._totalSymbolCount + 1); }

    public getTerminals(): Array<number> { return range(1, this._terminalsCount + 1); }

    public getSymInStr(num: number): string { return this._symbolIdMap.getSymbol(num); }

    public getSymId(sym: string): number { return this._symbolIdMap.getId(sym); }

    public isSymIdTerminal(id: number): boolean { return id <= this._terminalsCount; }

    public getProds(lhsSymId: number): Array<number> {
        if (!this._nonTerminalProdMap.has(lhsSymId)) {
            throw new Error(`given LHS symbol id does not map to productions: ${lhsSymId}`)
        }
        return this._nonTerminalProdMap.get(lhsSymId)!;
    }

    //from 0 -> n-1, n is the size of productions
    public getProdIds(): Array<number> { return range(this._idProdMap.length); }

    public getProdRef(prodnum: number): ProductionRef { return this._idProdMap[prodnum]; }

    public firstSet(): Array<Set<number>> {
        if (this._firstSet) return this._firstSet;

        const nullableNonTerminals = this.nullableNonTerminals();
        const retmap = new Array<Set<number>>(this._totalSymbolCount + 1);
        const edges: Edge[] = [];
        const nonTerminals = this.getNonTerminals();

        for (let nont of nonTerminals) {
            retmap[nont] = new Set<number>();
            for (let prodid of this.getProds(nont)) {
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

        mergeClosureSet(nonTerminals, closure.calcClosure(edges), retmap);

        for (let t of this.getTerminals()) retmap[t] = new Set<number>().add(t);

        return this._firstSet = retmap;
    }

    public followSet(): Array<Set<number>> {
        if (this._followSet) return this._followSet;

        const retmap = new Array<Set<number>>(this._totalSymbolCount + 1);
        const firstSetMap = this.firstSet();
        const nullableNonTerminals = this.nullableNonTerminals();
        const edges: Edge[] = [];
        // 0 is the id of "$"
        retmap[this._startNonTerminalId] = new Set().add(0);

        for (let nont of this.getNonTerminals()) {
            if (retmap[nont] == null) retmap[nont] = new Set<number>();
            for (let prodId of this.getProds(nont)) {
                const rhsIds = this.getProdRef(prodId).rhsIds;
                if (rhsIds.length === 0) continue;
                let i = 1, j = 0;
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

        mergeClosureSet(range(1, this._totalSymbolCount + 1), closure.calcClosure(edges), retmap);

        return this._followSet = retmap;
    }

    public nullableNonTerminals(): Set<number> {
        if (this._nullableNonTerminals) return this._nullableNonTerminals;

        const retset = new Set<number>();
        const nonTerminalsToProcess: Array<number> = [];
        const dependencyMap = new Map<number, Array<{ rhsIds: Array<number>, next: number, lsymId: number }>>();

        for (let nont of this.getNonTerminals()) {
            for (let prodid of this.getProds(nont)) {
                const rhsIds = this.getProdRef(prodid).rhsIds;
                if (rhsIds.length === 0) {
                    // no right hand side, nullable
                    if (!retset.has(nont)) {
                        retset.add(nont);
                        nonTerminalsToProcess.push(nont);
                    }
                    break;
                }
                if (this.isSymIdTerminal(rhsIds[0])) continue;
                // if for symbol rnums[0] becomes nullable, then lnum has a change to become nullable
                addToMapOfArr(dependencyMap, rhsIds[0], { rhsIds: rhsIds, next: 1, lsymId: nont });
            }
        }

        while (nonTerminalsToProcess.length > 0) {
            const lnum = nonTerminalsToProcess.pop()!;
            for (let dependentItem of (dependencyMap.get(lnum) || [])) {
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
                    addToMapOfArr(dependencyMap, symId, { rhsIds: dependentItem.rhsIds, next: next + 1, lsymId: dependentItem.lsymId });
                }
            }
        }

        return this._nullableNonTerminals = retset;
    }

    public leftFactoredProdSet(): ProdSet {
        const prods: Production[] = [];
        const idgen = new IdGen();

        for (let nont of this.getNonTerminals()) {
            // start non-terminal is added programmatically
            if (nont === this._startNonTerminalId) continue;
            leftFactoring(this.getSymInStr(nont), this.getProds(nont).map(p => this.getProdRef(p)).map(p => p.prod.getRHS()), 0, prods, idgen);
        }

        return prods.length === (this._prodCount - 1) ? this : new ProdSet(prods);
    }
}

function leftFactoring(lstr: string, rhsArr: Symbol[][], lfidx: number, prods: Production[], idGen: IdGen) {
    const lfmap = new Map<string, Symbol[][]>();
    const lfset = new Set<string>();
    let gonull = false;
    for (let rsymArr of rhsArr) {
        if (rsymArr.length === lfidx) gonull = true;
        else {
            const lfname = rsymArr[lfidx].getName();
            addToMapOfArr(lfmap, lfname, rsymArr);
            lfset.add(lfname);
        }
    }
    const lsymbol = new Symbol(false, lstr);
    if (gonull) prods.push(new Production(lsymbol, []));
    for (let lfname of lfset) {
        const rights = lfmap.get(lfname)!;
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
                    anchor = rights[0][lfidx + 1].getName();
                    while (i < rights.length && (rights[i].length > lfidx + 1) && rights[i][lfidx + 1].getName() === anchor)++i;
                }
            } while (i === rights.length)
            let newnont = ProdSet.preservedNonTerminalPrefix + idGen.next();
            prods.push(new Production(lsymbol, rights[0].slice(lfidx0, lfidx + 1).concat(new Symbol(false, newnont))));
            leftFactoring(newnont, rights, lfidx + 1, prods, idGen);
        }
    }
}

function addToMapOfArr<K, T>(map: Map<K, Array<T>>, key: K, item: T) {
    if (!map.has(key)) map.set(key, [item]);
    else map.get(key)!.push(item);
}

function addRangeToArrayOfSet<T>(map: Array<Set<T>>, key: number, item: Iterable<T>) {
    let set = map[key];
    if (!set) set = map[key] = new Set<T>();
    for (let s of item) set.add(s);
}

function mergeClosureSet(symIds: Iterable<number>, closuremap: Map<number, closure.Closure>, map: Array<Set<number>>) {
    for (let symId of symIds) {
        const closure = closuremap.get(symId);
        if (!closure) continue;
        for (let num of closure.getNodes()) {
            if (num === symId) continue;
            const symset = map[num];
            if (!symset) continue;
            let set = map[symId];
            if (!set)
                set = map[symId] = new Set<number>();
            for (let s of symset) set.add(s);
        };
    };
}

function collectProdSymbols(prods: Iterable<Production>): {
    terminals: Set<string>;
    nonTerminals: Set<string>;
} {
    const nonTerminals = new Set<string>();
    const terminals = new Set<string>();
    for (let prod of prods) {
        // left hand side symbol must be non-terminal
        nonTerminals.add(prod.getLHS().getName());
        for (let sym of prod.getRHS()) {
            // right hand side
            (sym.isTerminal() ? terminals : nonTerminals).add(sym.getName());
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
    nonTerminalProdMap: Map<number, number[]>;
} {
    const idProdMap: ProductionRef[] = [];
    const linkToNonTerminal: Edge[] = [];
    const nonTerminalProdMap = new Map<number, number[]>();
    for (let prod of prods) {
        const lhsId = symbolIdMap.getId(prod.getLHS().getName());
        const rhs = prod.getRHS();
        const prodId = idProdMap.length;
        idProdMap.push({
            prodId: prodId,
            prod: prod,
            lhsId: lhsId,
            rhsIds: rhs.map(s => {
                let rnum = symbolIdMap.getId(s.getName());
                if (!s.isTerminal()) linkToNonTerminal.push({ src: lhsId, tgt: rnum });
                return rnum;
            })
        });
        addToMapOfArr(nonTerminalProdMap, lhsId, prodId);
    }
    return { idProdMap, linkToNonTerminal, nonTerminalProdMap };
}

class SymbolIdMap {
    private _idmap: Map<string, number>;
    private _symmap: Array<string>;

    constructor() {
        this._idmap = new Map<string, number>();
        this._symmap = [];
    }

    // id starts from 0
    createSymbolsIfNotYet(...symbols: string[]): void {
        for (let symbol of symbols) {
            if (!this._idmap.has(symbol)) {
                const id = this._symmap.length;
                this._idmap.set(symbol, id);
                this._symmap.push(symbol);
            }
        }
    }

    getId(symbol: string): number {
        if (!this._idmap.has(symbol)) {
            throw new Error(`unexpected, SymbolIdMap does not have symbol: ${symbol}`);
        }
        return this._idmap.get(symbol)!;
    }

    getSymbol(id: number): string {
        return this._symmap[id];
    }

    get size(): number {
        return this._symmap.length;
    }
}
