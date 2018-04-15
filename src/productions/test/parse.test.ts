
import * as assert from "assert";
import { arrayEquivalent } from "../../testutil";
import { createProdSetWithSplitter } from "../index";
import { ProdSet } from "../production";


function validate(pset: ProdSet, expected: { lhs: string, rhsArr: { str: string, terminal: boolean }[][] }[]) {
    const startsymnum = pset.startNonTerminalId;
    const allLHS = pset.nonTerminals.filter(n => n !== startsymnum).map(n => pset.getSymInStr(n));
    assert.strictEqual(true, arrayEquivalent([...allLHS], expected.map(e => e.lhs)));
    for (let i = 0; i < expected.length; ++i) {
        const item = expected[i];
        assert.strictEqual(true, arrayEquivalent(item.rhsArr, pset.getProds(pset.getSymId(item.lhs)).map(p => pset.getProdRef(p).rhsIds), function (test, real): boolean {
            //test and real are both array
            if (test.length !== real.length) return false;
            for (let q = 0; q < test.length; ++q) {
                const titem = test[q], symId = real[q];
                if (pset.getSymId(titem.str) !== symId || titem.terminal !== pset.isSymIdTerminal(symId)) return false;
            }
            return true;
        }));
    }
};

describe("parse string into structured production set", function () {
    it("simple 1", function () {
        const pset = createProdSetWithSplitter([
            "E -> T + E | T",
            "T -> int | int * T | ( E )"
        ]);
        assert.strictEqual(ProdSet.reservedStartNonTerminal, pset.getSymInStr(pset.startNonTerminalId));
        validate(pset, [
            {
                lhs: "E",
                rhsArr: [
                    [
                        { str: "T", terminal: false },
                        { str: "+", terminal: true },
                        { str: "E", terminal: false }
                    ],
                    [
                        { str: "T", terminal: false }
                    ]
                ]
            }, {
                lhs: "T",
                rhsArr: [
                    [
                        { str: "int", terminal: true },
                        { str: "*", terminal: true },
                        { str: "T", terminal: false }
                    ],
                    [
                        { str: "(", terminal: true },
                        { str: "E", terminal: false },
                        { str: ")", terminal: true }
                    ],
                    [
                        { str: "int", terminal: true }
                    ]
                ]
            }
        ]);
    });

    it("simple 2", function () {
        const pset = createProdSetWithSplitter([
            "E -> int + int | "
        ]);
        assert.strictEqual(ProdSet.reservedStartNonTerminal, pset.getSymInStr(pset.startNonTerminalId));
        validate(pset, [
            {
                lhs: "E",
                rhsArr: [
                    [
                        { str: "int", terminal: true },
                        { str: "+", terminal: true },
                        { str: "int", terminal: true }
                    ],
                    []
                ]
            }
        ]);
    });

    it("not all non-terminal appears at LHS", function () {
        assert.throws(function () {
            return createProdSetWithSplitter([
                "E -> T | int"
            ]);
        }, Error);
    });
});
