
import * as prod from './production';
import * as _ from 'lodash';

let chA = 'A'.charCodeAt(0);
let chZ = 'Z'.charCodeAt(0);
function strAsNonTerminal(str: string): boolean {
    let ch = str.charCodeAt(0);
    return chA <= ch && ch <= chZ;
};

function createProduction(lstr: string, rstr: string): prod.Production {
    lstr = lstr.trim();
    rstr = rstr.trim();
    if (lstr.length === 0) throw new Error('left-hand-side is empty');
    if (lstr.indexOf(' ') >= 0) throw new Error('left-hand-side contains more than one symbol: ' + lstr);
    if (!strAsNonTerminal(lstr)) throw new Error('left-hand-side is not a non-terminal symbol: ' + lstr);
    if (_.startsWith(lstr, prod.ProdSet.preservedNonTerminalPrefix)) throw new Error('non-terminal cannot start with preserved prefix: ' + lstr);
    let lsymbol = new prod.Symbol(false, lstr);
    let rsymbols = rstr.split(' ').filter(str => str.length > 0).map(str => {
        if (_.startsWith(str, prod.ProdSet.preservedNonTerminalPrefix)) throw new Error('non-terminal cannot start with preserved prefix: ' + str);
        return new prod.Symbol(!strAsNonTerminal(str), str);
    });
    return new prod.Production(lsymbol, rsymbols);
}

// function createProduction2(prodstr: string): prod.Production {
//     let idxarrow = prodstr.indexOf('->');
//     if (idxarrow < 0) throw new Error('production must has a -> :' + prodstr);
//     let lstr = prodstr.slice(0, idxarrow), rstr = prodstr.slice(idxarrow + 2);
//     return createProduction(lstr, rstr);
// }

function createMultipleProductions(mprodstr: string, splitter?: string): Array<prod.Production> {
    let idxarrow = mprodstr.indexOf('->');
    if (idxarrow < 0) throw new Error('production must has a -> :' + mprodstr);
    let lstr = mprodstr.slice(0, idxarrow).trim();
    return mprodstr.slice(idxarrow + 2).trim().split(splitter || '|').map(rstr => createProduction(lstr, rstr));
}

export function createProdSet(mprodarr: Iterable<string>, splitter?: string): prod.ProdSet {
    let prods: Array<prod.Production> = [];
    for (let mprod of mprodarr) {
        for (var p of createMultipleProductions(mprod, splitter)) prods.push(p);
    }
    return new prod.ProdSet(prods);
}

export {ProdSet, Symbol, Production, ProductionRef} from './production';
