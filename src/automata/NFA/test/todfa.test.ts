
import * as assert from "assert";
import { Transition } from "../../index";
import { createNFA } from "../index";
import { createDFA } from "../../DFA";

function tran(src: number, tgt: number, str: string) {
    return new Transition(src, tgt, str);
};

describe("nfa convert to dfa", function () {
    it("simple 1", function () {
        var nfA = createNFA([
            tran(0, 0, "a"),
            tran(0, 1, ""),
            tran(1, 1, "b"),
            tran(1, 2, ""),
            tran(2, 2, "c"),
            tran(2, 3, ""),
            tran(3, 3, "d")
        ], [0], [3]);
        var dfA = nfA.toDFA().dfa;
        var dfA2 = createDFA([
            tran(10, 10, "a"),
            tran(10, 11, "b"),
            tran(10, 12, "c"),
            tran(10, 13, "d"),
            tran(11, 11, "b"),
            tran(11, 12, "c"),
            tran(11, 13, "d"),
            tran(12, 12, "c"),
            tran(12, 13, "d"),
            tran(13, 13, "d")
        ], 10, [10, 11, 12, 13]);
        assert.strictEqual(dfA2.equivalent(dfA), true);
        assert.strictEqual(dfA.equivalent(dfA2), true);
    });
});
