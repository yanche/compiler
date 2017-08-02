
import * as c from '../../../compile';
import * as assert from 'assert';
import { ProdSet } from "../../../productions";


interface ExpectedData {
    symstr: string;
    mid: boolean;
    children?: Array<ExpectedData>;
    rawstr?: string;
}

export function validate(prodset: ProdSet, tnode: c.ParseTreeNode, expected: ExpectedData) {
    assert.equal(tnode.symnum, prodset.getSymNum(expected.symstr));
    if (tnode instanceof c.ParseTreeMidNode) {
        assert.equal(expected.mid, true);
        let c1 = tnode.children, c2 = expected.children;
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
