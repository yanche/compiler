import { ParseTreeMidNode, ParseTreeNode, ParseTreeTermNode } from "../compile/parse";
import { ProdSet } from "../productions/production";


export interface ParseTreeNodeLiteral {
    symbol: string;
    children?: ParseTreeNodeLiteral[];
    token?: string;
}

export function validateParseTree(actual: ParseTreeMidNode, expected: ParseTreeNodeLiteral, prodset: ProdSet): { result: boolean; errmsg?: string } {
    // ignore first node since it's produced by preserved start production
    if (actual.symId === prodset.getSymId(ProdSet.reservedStartNonTerminal)) {
        actual = actual.children[0] as ParseTreeMidNode;
    }
    return _validateParseTree(actual, expected, prodset);
}

function _validateFail(errmsg: string): { result: boolean; errmsg: string } {
    return { result: false, errmsg: errmsg };
}

function _validateParseTree(actual: ParseTreeNode, expected: ParseTreeNodeLiteral, prodset: ProdSet): { result: boolean; errmsg?: string } {
    if (actual.symId !== prodset.getSymId(expected.symbol)) return _validateFail(`symbol does not match: ${actual.symId}, ${expected.symbol}`);
    if (actual instanceof ParseTreeMidNode) {
        if (!expected.children) return _validateFail(`expecting midnode, got leaf node`);
        if (actual.children.length !== expected.children.length) return _validateFail(`different child number: ${actual.children.length}, ${expected.children.length}`);
        for (let i = 0; i < expected.children.length; ++i) {
            const subret = _validateParseTree(actual.children[i], expected.children[i], prodset);
            if (!subret.result) return subret;
        }
        return { result: true };
    }
    if (actual instanceof ParseTreeTermNode) {
        if (!expected.token) return _validateFail(`expecting leaf node, got midnode`);
        if (expected.token !== actual.token.rawstr) _validateFail(`symbol does not match: ${actual.token.rawstr}, ${expected.token}`);
        return { result: true };
    }
    return { result: false };
}
