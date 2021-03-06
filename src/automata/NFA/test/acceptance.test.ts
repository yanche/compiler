
import * as assert from "assert";
import { Transition } from "../../index";
import { createNFA } from "../index";
import NFA from "../nfa";

interface AcceptValidor {
    str: string;
    expected: boolean;
}

//arr: array of {str:, expected: bool}
function bulkValidate(arr: Array<AcceptValidor>, nfa: NFA) {
    for (const item of arr) {
        assert.strictEqual(item.expected, nfa.accept(item.str.split("")));
    }
};

//arr: array of strings
function acceptStrings(arr: Array<string>, nfa: NFA) {
    bulkValidate(arr.map(function (str) { return { str: str, expected: true } }), nfa);
};

function tran(src: number, tgt: number, str: string): Transition {
    return new Transition(src, tgt, str);
};

describe("nfa-acceptance", () => {
    describe("no epsilon move", () => {
        it("1 state", () => {
            bulkValidate([
                { str: "aaaaa", expected: true },
                { str: "a", expected: true },
                { str: "b", expected: false },
                { str: "baa", expected: false }
            ], createNFA([tran(0, 0, "a")], [0], [0]));
        });

        it("2 states", () => {
            bulkValidate([
                { str: "aaaaa", expected: false },
                { str: "a", expected: true }
            ], createNFA([tran(0, 1, "a")], [0], [1]));
        });

        it("3 states", () => {
            bulkValidate([
                { str: "ab", expected: true },
                { str: "a", expected: false }
            ], createNFA([tran(0, 1, "a"), tran(1, 2, "b")], [0], [2]));
        });
    });

    describe("epsilon moves", () => {
        it("4 states", () => {
            acceptStrings(["a", "b", "c", "d", "aa", "bb", "cc", "dd", "abcd",
                "aabbccdd", "ad", "accdd", "bbcd",
                "bbdd"], createNFA([
                    tran(0, 0, "a"),
                    tran(0, 1, ""),
                    tran(1, 1, "b"),
                    tran(1, 2, ""),
                    tran(2, 2, "c"),
                    tran(2, 3, ""),
                    tran(3, 3, "d")
                ], [0], [3]));
        });
    });
});
