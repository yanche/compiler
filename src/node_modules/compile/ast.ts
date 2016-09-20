
import * as p from './parse';
import * as prod from 'productions';

export abstract class ASTNode { }

export class ASTConverter<T> {
    protected _handlers: Array<(node: p.ParseTreeMidNode) => T>;
    protected _prodset: prod.ProdSet;

    constructor(prodset: prod.ProdSet, handlermap: Map<string, (node: p.ParseTreeMidNode) => T>) {
        this._handlers = new Array<(node: p.ParseTreeMidNode) => T>();
        this._prodset = prodset;
        if (handlermap.size != prodset.getProdIds().length) throw new Error('handler size does not match productions count: ' + handlermap.size + ', ' + prodset.getProdIds().length);
        for (let h of handlermap) {
            let prodid = prodset.getProdIdByLiteral(h[0]);
            if (prodid == null) throw new Error('prodid not found for production: ' + h[0]);
            if (this._handlers[prodid] != null) throw new Error('handler already exists for prodid: ' + prodid);
            this._handlers[prodid] = h[1];
        }
    }

    toAST(root: p.ParseTreeMidNode): T {
        let handler = this._handlers[root.prodId];
        if (handler == null) throw new Error('handler not found for prod: ' + this._prodset.getProdRef(root.prodId).prod.getLiteral());
        return handler(root);
    }
}
