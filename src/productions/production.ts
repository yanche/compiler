
import * as utility from 'utility';
import * as _ from 'lodash';

//terminal symbol or non-terminal symbol, used in productions
export class Symbol {
    private _terminal: boolean;
    private _name: string;

    constructor(terminal: boolean, name: string) {
        if (name === '$') throw new Error('$ is reserved as a symbol');
        this._terminal = terminal;
        this._name = name;
    }
    isTerminal(): boolean { return this._terminal; }
    getName(): string { return this._name; }
}

//one production, includes left-hand-side (one non-terminal symbol) and right-hand-side (a list of symbols)
export class Production {
    private _lhs: Symbol;
    private _rhs: Array<Symbol>;
    private _literal: string;

    constructor(lhs: Symbol, rhs: Array<Symbol>) {
        if (lhs.isTerminal()) throw new Error('left-hand-side of production must be non-terminal');
        this._lhs = lhs;
        this._rhs = rhs || [];
        this._literal = Production.id(this._lhs, this._rhs);
    }
    getLHS(): Symbol { return this._lhs; }
    getRHS(): Array<Symbol> { return this._rhs; }
    getLiteral(): string { return this._literal; }
    print(): this { console.log(this.getLiteral()); return this; }
    static id(lhs: Symbol | string, rhs: Array<Symbol>) {
        let lstr: string;
        if (lhs instanceof Symbol) lstr = lhs.getName();
        else lstr = lhs;
        return lstr + ' -> ' + rhs.map(r => r.getName()).join(' ');
    }
}

//private struct to present a production
export interface ProductionRef {
    prod: Production;
    lnum: number;
    rnums: Array<number>;
    prodid: number;
}

//a group of productions, will assign an integer to each symbol, '$' takes 0, then terminals, then non-terminals
//also an integer will be assigned to each production, starts from 0
export class ProdSet {
    private _startnontnum: number; //integer for start symbol
    private _prodliteralmap: Map<string, number>;
    private _nontprodmap: Array<Array<number>>; //integer of non-terminal -> array of id of productions by it as lhs
    private _numprodmap: Array<ProductionRef>;  //production id -> production
    private _symnummap: utility.BidirectMap<string>; //integer of symbol <--> string of symbol
    private _termict: number;       //count of terminal symbols
    private _totalsymct: number;    //count of total symbols
    private _nullableNonTerminals: Set<number>; //set of integer of non-terminal symbols which could produce epsilon
    private _firstSet: Array<Set<number>>; //integer of symbol -> first set (epsilon is not included)
    private _followSet: Array<Set<number>>; //integer of symbol -> follow set
    static preservedNonTerminalPrefix: string = 'D__';

    constructor(prods: Iterable<Production>) {
        let termict = 0, nonterminals = new Set<string>(), symnummap = new utility.BidirectMap<string>();
        let numprodmap = new Array<ProductionRef>(), nontprodmap = new Array<Array<number>>() //map from number of non-terminal to number its productions;
        let prodliteralmap = new Map<string, number>(), startnontnum: number, reachedges: Array<utility.Edge> = [], prodidgen = new utility.IdGen();
        //in the first scan loop, assign an integer to all symbols, terminals first then non-terminals
        //0 is the end-of-input symbol
        symnummap.getOrCreateNum('$');
        for (let prod of prods) {
            nonterminals.add(prod.getLHS().getName());
            for (let sym of prod.getRHS()) {
                if (sym.isTerminal()) symnummap.getOrCreateNum(sym.getName());
                else nonterminals.add(sym.getName());
            }
        }
        termict = symnummap.size - 1;
        for (let nont of nonterminals) symnummap.getOrCreateNum(nont);

        for (let prod of prods) {
            let lnum = symnummap.getNum(prod.getLHS().getName()), rhs = prod.getRHS(), prodid = prodidgen.next();
            let prodliteral = prod.getLiteral();
            if (prodliteralmap.has(prodliteral)) throw new Error('duplicate production is not allowed: ' + prodliteral);
            prodliteralmap.set(prodliteral, prodid);
            if (startnontnum == null) startnontnum = lnum;
            numprodmap.push({
                prodid: prodid, prod: prod, lnum: lnum, rnums: rhs.map(s => {
                    let rnum = symnummap.getNum(s.getName());
                    if (!s.isTerminal()) reachedges.push({ src: lnum, tgt: rnum });
                    return rnum;
                })
            });
            addToArrOfArr(nontprodmap, lnum - 1 - termict, prodid);
        }
        if (nontprodmap.length !== nonterminals.size) throw new Error('not all non-terminals appear at LHS');
        if (utility.closure.calcClosureOfOneNode(reachedges, startnontnum).size !== nonterminals.size) throw new Error('some non-terminals are unreachable from start symbol');

        this._startnontnum = startnontnum;
        this._prodliteralmap = prodliteralmap;
        this._nontprodmap = nontprodmap;
        this._numprodmap = numprodmap;
        this._symnummap = symnummap;
        this._termict = termict;
        this._totalsymct = symnummap.size - 1;
    }
    getStartNonTerminal(): number { return this._startnontnum; }
    getStartNonTerminalInStr(): string { return this.getSymInStr(this.getStartNonTerminal()); }
    getAllSymNums(): Array<number> { return _.range(1, this._totalsymct + 1); }
    getNonTerminals(): Array<number> { return _.range(this._termict + 1, this._totalsymct + 1); }
    getNonTerminalsInStr(): Array<string> { return this.getNonTerminals().map(n => this.getSymInStr(n)); }
    getTerminals(): Array<number> { return _.range(1, this._termict + 1); }
    getTerminalsInStr(): Array<string> { return this.getTerminals().map(n => this.getSymInStr(n)); }
    getSymInStr(num: number): string { return this._symnummap.getT(num); }
    getSymNum(sym: string): number { return this._symnummap.getNum(sym); }
    isSymNumTerminal(num: number): boolean { return num <= this._termict; }
    getProds(lsymnum: number): Array<number> { return this._nontprodmap[lsymnum - 1 - this._termict]; }
    //from 0 -> n-1, n is the size of productions
    getProdIds(): Array<number> { return _.range(this._numprodmap.length); }
    getProdRef(prodnum: number): ProductionRef { return this._numprodmap[prodnum]; }
    getProdIdByLiteral(prodliteral: string): number { return this._prodliteralmap.get(prodliteral); }
    //getProdSize(): number { return this._numprodmap.length; }
    //getAllProds(): Array<number> { return _.range(this.getProdSize()); }
    print(): this { for (let p of this._prodliteralmap) console.log(p[0]); return this; }
    firstSet(): Array<Set<number>> {
        if (this._firstSet != null) return this._firstSet;
        let nullablenont = this.nullableNonTerminals(), retmap = new Array<Set<number>>(this._totalsymct + 1);
        let edges: Array<utility.Edge> = [], nonterminals = this.getNonTerminals();
        for (let nont of nonterminals) {
            retmap[nont] = new Set<number>();
            for (let prodid of this.getProds(nont)) {
                let prodref = this.getProdRef(prodid);
                let genepsilon = true, loc = 0;
                while (loc < prodref.rnums.length && genepsilon) {
                    let rnum = prodref.rnums[loc];
                    if (this.isSymNumTerminal(rnum)) {
                        retmap[nont].add(rnum);
                        genepsilon = false;
                    }
                    else {
                        edges.push({ src: nont, tgt: rnum }); //could have dup edge, it's fine
                        genepsilon = nullablenont.has(rnum);
                        ++loc;
                    }
                }
            }
        }
        mergeClosureSet(nonterminals, utility.closure.calcClosure(edges), retmap);
        for (let t of this.getTerminals()) retmap[t] = new Set<number>().add(t);
        this._firstSet = retmap;
        return retmap;
    }
    followSet(): Array<Set<number>> {
        if (this._followSet != null) return this._followSet;
        let retmap = new Array<Set<number>>(this._totalsymct + 1), firstSetMap = this.firstSet(), nullablenonterminals = this.nullableNonTerminals(), edges: Array<utility.Edge> = [];
        retmap[this._startnontnum] = new Set().add(0);
        for (let nont of this.getNonTerminals()) {
            if (retmap[nont] == null) retmap[nont] = new Set<number>();
            for (let prodid of this.getProds(nont)) {
                let rnums = this.getProdRef(prodid).rnums;
                if (rnums.length === 0) continue;
                let i = 1, j = 0;
                while (i < rnums.length) {
                    let rnum = rnums[i];
                    let fset = firstSetMap[rnum];
                    let s = j;
                    while (s < i) addRangeToArrayOfSet(retmap, rnums[s++], fset);
                    if (!nullablenonterminals.has(rnum)) j = i;
                    ++i;
                }
                while (j < i) {
                    let rnum = rnums[j];
                    if (rnum != nont) edges.push({ src: rnum, tgt: nont });
                    ++j;
                }
            }
        }
        let clomap = utility.closure.calcClosure(edges);
        mergeClosureSet(this.getAllSymNums(), clomap, retmap);
        this._followSet = retmap;
        return retmap;
    }
    nullableNonTerminalsInStr(): Array<string> {
        return [...this.nullableNonTerminals()].map(n => this.getSymInStr(n));
    }
    nullableNonTerminals(): Set<number> {
        if (this._nullableNonTerminals != null) return this._nullableNonTerminals;
        let retset = new Set<number>(), queue: Array<number> = [];
        let map = new Array<Array<{ rnums: Array<number>, next: number, lnum: number }>>(); //for symbol S becomes nullable, which other symbols may be affected
        for (let nont of this.getNonTerminals()) {
            for (let prodid of this.getProds(nont)) {
                let rnums = this.getProdRef(prodid).rnums;
                if (rnums.length === 0) {
                    if (!retset.has(nont)) {
                        retset.add(nont);
                        queue.push(nont);
                    }
                    break;
                }
                if (this.isSymNumTerminal(rnums[0])) continue;
                addToArrOfArr(map, rnums[0], { rnums: rnums, next: 1, lnum: nont });
            }
        }
        while (queue.length > 0) {
            let lnum = queue.pop();
            for (let ditem of (map[lnum] || [])) {
                if (retset.has(ditem.lnum)) continue;
                let next = ditem.next;
                while (next < ditem.rnums.length && retset.has(ditem.rnums[next]))++next;
                if (next === ditem.rnums.length) {
                    retset.add(ditem.lnum);
                    queue.push(ditem.lnum);
                }
                else {
                    let symnum = ditem.rnums[next];
                    if (this.isSymNumTerminal(symnum)) continue;
                    addToArrOfArr(map, symnum, { rnums: ditem.rnums, next: next + 1, lnum: ditem.lnum }); //now the 'able to produce nullable' depends on symbol 'symnum'
                }
            }
        }
        this._nullableNonTerminals = retset;
        return retset;
    }
    leftFactoredProdSet(): ProdSet {
        let prods: Array<Production> = [], idgen = new utility.IdGen();
        for (var nont of this.getNonTerminals()) {
            leftFactoring(this.getSymInStr(nont), this.getProds(nont).map(p => this.getProdRef(p)).map(p => p.prod.getRHS()), 0, prods, idgen);
        }
        return prods.length === this._prodliteralmap.size ? this : new ProdSet(prods);
    }
    printFollowSet(): this {
        console.log('follow set');
        let fset = this.followSet();
        for (let symnum of this.getAllSymNums()) {
            console.log(this.getSymInStr(symnum) + ':');
            console.log([...fset[symnum]].map(symnum2 => this.getSymInStr(symnum2)).join(' '));
        }
        return this;
    }
}

function leftFactoring(lstr: string, rhsarr: Array<Array<Symbol>>, lfidx: number, prods: Array<Production>, idGen: utility.IdGen) {
    var lfmap = new Map<string, Array<Array<Symbol>>>(), gonull = false, lfset = new Set<string>();
    for (let rsymarr of rhsarr) {
        if (rsymarr.length === lfidx) gonull = true;
        else {
            let lfname = rsymarr[lfidx].getName();
            addToMapOfArr(lfmap, lfname, rsymarr);
            lfset.add(lfname);
        }
    }
    let lsymbol = new Symbol(false, lstr);
    if (gonull) prods.push(new Production(lsymbol, []));
    for (let lfname of lfset) {
        let rights = lfmap.get(lfname);
        if (rights.length === 1) prods.push(new Production(lsymbol, lfidx > 0 ? rights[0].slice(lfidx) : rights[0]));
        else {
            let goahead = false, i = 1, lfidx0 = lfidx, anchor: string;
            lfidx -= 1;
            do {
                lfidx += 1;
                i = 1;
                if (rights[0].length > lfidx + 1) {
                    anchor = rights[0][lfidx + 1].getName();
                    while (i < rights.length && (rights[i].length > lfidx + 1) && rights[i][lfidx + 1].getName() === anchor)++i;
                }
            } while (i === rights.length)
            var newnont = ProdSet.preservedNonTerminalPrefix + idGen.next();
            prods.push(new Production(lsymbol, rights[0].slice(lfidx0, lfidx + 1).concat(new Symbol(false, newnont))));
            leftFactoring(newnont, rights, lfidx + 1, prods, idGen);
        }
    }
}

function addToArrOfArr<T>(map: Array<Array<T>>, key: number, item: T) {
    if (map[key] == null) map[key] = [item];
    else map[key].push(item);
}

function addToMapOfArr<K, T>(map: Map<K, Array<T>>, key: K, item: T) {
    if (!map.has(key)) map.set(key, [item]);
    else map.get(key).push(item);
}

function addRangeToArrayOfSet<T>(map: Array<Set<T>>, key: number, item: Iterable<T>) {
    let set = map[key];
    if (set == null) set = map[key] = new Set<T>();
    for (let s of item) set.add(s);
}

function mergeClosureSet(symnums: Iterable<number>, closuremap: Map<number, utility.closure.Closure>, map: Array<Set<number>>) {
    for (let symnum of symnums) {
        let closure = closuremap.get(symnum);
        if (closure == null) continue;
        for (let num of closure.getNodes()) {
            if (num === symnum) continue;
            let symset = map[num];
            if (symset == null) continue;
            let set = map[symnum];
            if (set == null)
                set = map[symnum] = new Set<number>();
            for (let s of symset) set.add(s);
        };
    };
}
