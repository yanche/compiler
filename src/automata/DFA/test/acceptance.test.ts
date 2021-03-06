
import * as assert from "assert";
import { Transition } from "../../index";
import { createDFA } from "../index";
import DFA from "../dfa";

interface AcceptValidor {
    str: string;
    expected: boolean;
}
//arr: array of {str:, expected: bool}
function bulkValidate(arr: Array<AcceptValidor>, dfa: DFA) {
    for (const item of arr) {
        assert.strictEqual(item.expected, dfa.accept(item.str.split("")));
    }
};

// //arr: array of strings
// function acceptStrings(arr: Array<string>, dfa: DFA) {
//     bulkValidate(arr.map(function (str) { return { str: str, expected: true } }), dfa);
// };

function tran(src: number, tgt: number, str: string): Transition {
    return new Transition(src, tgt, str);
};

describe("dfa-acceptance", () => {
    it("1 state", () => {
        bulkValidate([
            { str: "aaaaa", expected: true },
            { str: "a", expected: true },
            { str: "b", expected: false },
            { str: "baa", expected: false }
        ], createDFA([tran(0, 0, "a")], 0, [0]));
    });

    it("2 states", () => {
        bulkValidate([
            { str: "aaaaa", expected: false },
            { str: "a", expected: true },
            { str: "b", expected: false },
            { str: "baa", expected: false }
        ], createDFA([tran(0, 1, "a")], 0, [1]));
    });

    it("star", () => {
        bulkValidate([
            { str: "aaaaa", expected: false },
            { str: "a", expected: true },
            { str: "b", expected: true },
            { str: "c", expected: true },
            { str: "baa", expected: false }
        ], createDFA([tran(0, 1, "a"), tran(0, 2, "b"), tran(0, 3, "c")], 0, [1, 2, 3]));
    });
});
