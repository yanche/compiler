
import { ParseTreeMidNode, Parser } from "./parse";
import { createProdSet, ProdSet } from "../productions";
import { ProductionId } from "../utility";

export abstract class ASTNode { };

// parse tree node to ast node converter
export interface PTN2ASTNConverter {
    (node: ParseTreeMidNode): ASTNode;
}

export class ASTConverter<T extends ASTNode> {
    protected _handlermap: Map<ProductionId, PTN2ASTNConverter>;

    constructor(handlermap: Map<ProductionId, PTN2ASTNConverter>) {
        this._handlermap = handlermap;
    }

    public toAST(root: ParseTreeMidNode): T {
        if (!this._handlermap.has(root.prodId)) throw new Error(`handler not found for prodId: ${root.prodId}`);
        return <T>this._handlermap.get(root.prodId)!(root);
    }
}

export interface ParseTreeHandlerItem {
    readonly production: string;
    readonly handler: PTN2ASTNConverter;
}

export interface SyntaxProcessor<T> {
    readonly prodSet: ProdSet;
    readonly parser: Parser;
    readonly astConverter: ASTConverter<T>;
}

export function defineSyntaxProcessor<T>(
    prodHandlers: ParseTreeHandlerItem[],
    parserCreator: (prodset: ProdSet) => Parser,
    astConverterCreator?: (handlermap: Map<number, PTN2ASTNConverter>) => ASTConverter<T>
): SyntaxProcessor<T> {
    const prods = prodHandlers.map(h => h.production);
    const prodsNameSet = new Set<string>(prods);
    if (prodsNameSet.size !== prods.length)
        throw new Error(`productions has duplication`);
    const prodset = createProdSet(prods);
    // the first N prodId are set corresponding to the input productions
    const prodIds = prodset.prodIds;
    const handlermap = new Map<number, PTN2ASTNConverter>();
    prodHandlers.forEach((h, idx) => {
        handlermap.set(prodIds[idx], h.handler);
    });
    return {
        astConverter: astConverterCreator ? astConverterCreator(handlermap) : new ASTConverter<T>(handlermap),
        parser: parserCreator(prodset),
        prodSet: prodset
    }
}
