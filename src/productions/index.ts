
import { Production, ProdSet, Symbol } from "./production";
import { startsWith } from "../utility";

const chA = "A".charCodeAt(0);
const chZ = "Z".charCodeAt(0);
function strAsNonTerminal(str: string): boolean {
    const ch = str.charCodeAt(0);
    return chA <= ch && ch <= chZ;
};

function createProduction(lstr: string, rstr: string): Production {
    lstr = lstr.trim();
    rstr = rstr.trim();
    if (lstr.length === 0) throw new Error("left-hand-side is empty");
    if (lstr.indexOf(" ") >= 0) throw new Error("left-hand-side contains more than one symbol: " + lstr);
    if (!strAsNonTerminal(lstr)) throw new Error("left-hand-side is not a non-terminal symbol: " + lstr);
    if (startsWith(lstr, ProdSet.preservedNonTerminalPrefix)) throw new Error("non-terminal cannot start with preserved prefix: " + lstr);
    const lsymbol = new Symbol(false, lstr);
    const rsymbols = rstr.split(" ").filter(str => str.length > 0).map(str => {
        if (startsWith(str, ProdSet.preservedNonTerminalPrefix)) throw new Error("non-terminal cannot start with preserved prefix: " + str);
        return new Symbol(!strAsNonTerminal(str), str);
    });
    return new Production(lsymbol, rsymbols);
}

// function createProduction2(prodstr: string): Production {
//     const idxarrow = prodstr.indexOf("->");
//     if (idxarrow < 0) throw new Error("production must has a -> :" + prodstr);
//     const lstr = prodstr.slice(0, idxarrow), rstr = prodstr.slice(idxarrow + 2);
//     return createProduction(lstr, rstr);
// }

function createMultipleProductions(mprodstr: string, splitter?: string): Production[] {
    const idxarrow = mprodstr.indexOf("->");
    if (idxarrow < 0) throw new Error("production must has a -> :" + mprodstr);
    const lstr = mprodstr.slice(0, idxarrow).trim();
    if (splitter === undefined) {
        const rstr = mprodstr.slice(idxarrow + 2).trim();
        return [createProduction(lstr, rstr)];
    }
    else {
        return mprodstr.slice(idxarrow + 2).trim().split(splitter).map(rstr => createProduction(lstr, rstr));
    }
}

export function createProdSet(mprodarr: Iterable<string>): ProdSet {
    const prods: Production[] = [];
    for (const mprod of mprodarr) {
        for (const p of createMultipleProductions(mprod)) prods.push(p);
    }
    return new ProdSet(prods);
}

export function createProdSetWithSplitter(mprodarr: Iterable<string>, splitter?: string): ProdSet {
    const prods: Production[] = [];
    for (const mprod of mprodarr) {
        for (const p of createMultipleProductions(mprod, splitter || "|")) prods.push(p);
    }
    return new ProdSet(prods);
}

export { ProdSet, Symbol, Production, ProductionRef } from "./production";
