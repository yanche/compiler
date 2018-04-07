
import * as c from '../../../compile';
import { assert } from 'chai';
import { ProdSet } from "../../../productions";


export interface ExpectedData {
    symstr: string;
    mid: boolean;
    children?: Array<ExpectedData>;
    rawstr?: string;
}

export function validate(prodset: ProdSet, tnode: c.ParseTreeNode, expected: ExpectedData) {
    assert.equal(tnode.symId, prodset.getSymId(expected.symstr));
    if (tnode instanceof c.ParseTreeMidNode) {
        assert.equal(expected.mid, true);
        const c1 = tnode.children, c2 = expected.children!;
        assert.equal(c1.length, c2.length);
        for (let i = 0; i < c1.length; ++i) validate(prodset, c1[i], c2[i]);
    }
    else if (tnode instanceof c.ParseTreeTermNode) {
        assert.equal(expected.mid, false);
        assert.equal(expected.rawstr, tnode.token.rawstr);
    }
    else
        throw new Error('impossible code path');
}
