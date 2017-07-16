
import * as c from 'compile';
import * as assert from 'assert';


interface ExpectedData {
    symstr: string;
    mid: boolean;
    children?: Array<ExpectedData>;
    rawstr?: string;
}

export function validate(tnode: c.ParseTreeNode, expected: ExpectedData) {
    assert.equal(tnode.symstr, expected.symstr);
    if (tnode instanceof c.ParseTreeMidNode) {
        assert.equal(expected.mid, true);
        let c1 = tnode.children, c2 = expected.children;
        assert.equal(c1.length, c2.length);
        for (let i = 0; i < c1.length; ++i) validate(c1[i], c2[i]);
    }
    else if (tnode instanceof c.ParseTreeTermNode) {
        assert.equal(expected.mid, false);
        assert.equal(expected.rawstr, tnode.token.rawstr);
    }
    else
        throw new Error('impossible code path');
}
