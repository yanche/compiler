
import LR1Parser from './lr1parser';
import SLR1Parser from './slr1parser';
import LALR1Parser from './lalr1parser';
import * as prod from '../../productions';

export function createSLR1Parser(mprodarr: Iterable<string>, splitter?: string): SLR1Parser {
    return new SLR1Parser(prod.createProdSet(mprodarr, splitter));
}

export function createLR1Parser(mprodarr: Iterable<string>, splitter?: string): LR1Parser {
    return new LR1Parser(prod.createProdSet(mprodarr, splitter));
}

export function createLALR1Parser(mprodarr: Iterable<string>, splitter?: string): LALR1Parser {
    return new LALR1Parser(prod.createProdSet(mprodarr, splitter));
}

export {LR0Item} from './util';
