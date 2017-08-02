
import { ParseTreeMidNode, Parser } from "./parse";
import { createProdSet, ProdSet } from "../productions";

export abstract class ASTNode { };

export class ASTConverter {
    protected _handlermap: Map<number, (node: ParseTreeMidNode) => ASTNode>;
    // protected _prodset: prod.ProdSet;

    constructor(handlermap: Map<number, (node: ParseTreeMidNode) => ASTNode>) {
        this._handlermap = handlermap;
    }

    toAST(root: ParseTreeMidNode): ASTNode {
        let handler = this._handlermap.get(root.prodId);
        if (!handler) throw new Error(`handler not found for prodId: ${root.prodId}`);
        return handler(root);
    }
}

export interface ParseTreeHandlerItem {
    production: string;
    handler: (node: ParseTreeMidNode) => ASTNode;
}

export interface SyntaxProcessor {
    prodSet: ProdSet;
    parser: Parser;
    astConverter: ASTConverter;
}

export function defineSyntaxProcessor(prodHandlers: ParseTreeHandlerItem[], parserCreator: (prodset: ProdSet) => Parser, astConverterCreator?: (handlermap: Map<number, (node: ParseTreeMidNode) => ASTNode>) => ASTConverter): SyntaxProcessor {
    const prods = prodHandlers.map(h => h.production);
    const prodset = createProdSet(prods);
    // the first N prodId are set corresponding to the input productions
    const prodIds = prodset.getProdIds();
    const handlermap = new Map<number, (node: ParseTreeMidNode) => ASTNode>();
    prodHandlers.forEach((h, idx) => {
        handlermap.set(prodIds[idx], h.handler);
    });
    return {
        astConverter: astConverterCreator ? astConverterCreator(handlermap) : new ASTConverter(handlermap),
        parser: parserCreator(prodset),
        prodSet: prodset
    }
}

