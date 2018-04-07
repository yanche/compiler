
import { assert } from "chai";
import * as utility from "../../utility";
import { createProdSetWithSplitter } from "../index";
import { ProdSet } from "../production";


function validate(pset: ProdSet, expected: { lhs: string, rhsArr: { str: string, terminal: boolean }[][] }[]) {
    const startsymnum = pset.getStartNonTerminal();
    const allLHS = pset.getNonTerminals().filter(n => n !== startsymnum).map(n => pset.getSymInStr(n));
    assert.equal(true, utility.arrayEquivalent([...allLHS], expected.map(e => e.lhs)));
    for (let i = 0; i < expected.length; ++i) {
        const item = expected[i];
        assert.equal(true, utility.arrayEquivalent(item.rhsArr, pset.getProds(pset.getSymId(item.lhs)).map(p => pset.getProdRef(p).rhsIds), function (test, real): boolean {
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
        assert.equal(ProdSet.reservedStartNonTerminal, pset.getSymInStr(pset.getStartNonTerminal()));
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
        assert.equal(ProdSet.reservedStartNonTerminal, pset.getSymInStr(pset.getStartNonTerminal()));
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
