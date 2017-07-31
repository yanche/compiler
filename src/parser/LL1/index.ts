
import LL1Parser from './parser';
import { ProdSet } from '../../productions';

export function createLL1Parser(prodset: ProdSet): LL1Parser {
    return new LL1Parser(prodset);
}