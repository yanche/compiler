
import { ParseTreeNode, ParseTreeTermNode, ParseTreeMidNode } from "../../../compile";
import * as assert from "assert";
import { ProdSet } from "../../../productions";


export interface ExpectedData {
    symstr: string;
    mid: boolean;
    children?: Array<ExpectedData>;
    rawstr?: string;
}

export function validate(prodset: ProdSet, tnode: ParseTreeNode, expected: ExpectedData) {
    assert.strictEqual(tnode.symId, prodset.getSymId(expected.symstr));
    if (tnode instanceof ParseTreeMidNode) {
        assert.strictEqual(expected.mid, true);
        const c1 = tnode.children, c2 = expected.children!;
        assert.strictEqual(c1.length, c2.length);
        for (let i = 0; i < c1.length; ++i) validate(prodset, c1[i], c2[i]);
    }
    else if (tnode instanceof ParseTreeTermNode) {
        assert.strictEqual(expected.mid, false);
        assert.strictEqual(expected.rawstr, tnode.token.rawstr);
    }
    else
        throw new Error("impossible code path");
}
