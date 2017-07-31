
import { ProdSet } from '../productions';
import { Token, ParseReturn } from '../compile';

abstract class Parser {
    protected _prodset: ProdSet;

    constructor(prodset: ProdSet) {
        this._prodset = prodset;
    }

    abstract parse(tokens: Array<Token>): ParseReturn;

    abstract isValid(): boolean;

    // get prodset(): ProdSet { return this._prodset; }
}

export default Parser;
