
import LL1Parser from './parser';
import * as prod from '../../productions';

export function createLL1Parser(mprodarr: Iterable<string>, toleftfactored?: boolean, splitter?: string): LL1Parser {
    let prodset = prod.createProdSet(mprodarr, splitter);
    return new LL1Parser(toleftfactored ? prodset.leftFactoredProdSet() : prodset);
}