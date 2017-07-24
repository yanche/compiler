
import * as prod from '../productions';
import * as c from '../compile';

abstract class Parser {
    protected _prodset: prod.ProdSet;

    constructor(prodset: prod.ProdSet) {
        this._prodset = prodset;
    }

    abstract parse(tokens: Array<c.Token>): c.ParseReturn;

    abstract isValid(): boolean;

    get prodset(): prod.ProdSet { return this._prodset; }
}

export default Parser;
