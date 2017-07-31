
import LR1Parser from './lr1parser';
import SLR1Parser from './slr1parser';
import LALR1Parser from './lalr1parser';
import { ProdSet } from "../../productions";

export function createSLR1Parser(prodset: ProdSet): SLR1Parser {
    return new SLR1Parser(prodset);
}

export function createLR1Parser(prodset: ProdSet): LR1Parser {
    return new LR1Parser(prodset);
}

export function createLALR1Parser(prodset: ProdSet): LALR1Parser {
    return new LALR1Parser(prodset);
}
