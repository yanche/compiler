
import { assert } from "chai";
import * as utility from "../../utility";
import { createProdSetWithSplitter } from "../index";
import * as prod from "../production";

function validate(pset: prod.ProdSet, expected: Array<{ lhs: string, rhsArr: Array<Array<{ str: string, terminal: boolean }>> }>) {
    const startsymnum = pset.startNonTerminalId;
    const allLHS = [...pset.nonTerminals].filter(n => n != startsymnum).map(n => pset.getSymInStr(n));
    assert.equal(true, utility.arrayEquivalent([...allLHS], expected.map(e => e.lhs)));
    for (let i = 0; i < expected.length; ++i) {
        const item = expected[i];
        assert.equal(true, utility.arrayEquivalent(item.rhsArr, pset.getProds(pset.getSymId(item.lhs)).map(p => pset.getProdRef(p).rhsIds), function (test, real) {
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

describe("production set left factoring", function () {
    it("simple 1", function () {
        const pset = createProdSetWithSplitter([
            "E -> T + E | T",
            "T -> int | int * T | ( E )"
        ]);
        const lfprodset = pset.leftFactoredProdSet();
        const new1 = lfprodset.getSymInStr(lfprodset.getProdRef(lfprodset.getProds(lfprodset.getSymId("E"))[0]).rhsIds[1]);
        const trhsarr = lfprodset.getProds(lfprodset.getSymId("T"));
        const new2 = lfprodset.getSymInStr(lfprodset.getProdRef(trhsarr[lfprodset.getProdRef(trhsarr[0]).rhsIds.length == 2 ? 0 : 1]).rhsIds[1]);
        validate(lfprodset, [
            {
                lhs: "E",
                rhsArr: [
                    [
                        { str: "T", terminal: false },
                        { str: new1, terminal: false }
                    ]
                ]
            }, {
                lhs: new1,
                rhsArr: [
                    [
                        { str: "+", terminal: true },
                        { str: "E", terminal: false }
                    ],
                    []
                ]
            }, {
                lhs: "T",
                rhsArr: [
                    [
                        { str: "int", terminal: true },
                        { str: new2, terminal: false }
                    ],
                    [
                        { str: "(", terminal: true },
                        { str: "E", terminal: false },
                        { str: ")", terminal: true }
                    ]
                ]
            }, {
                lhs: new2,
                rhsArr: [
                    [],
                    [
                        { str: "*", terminal: true },
                        { str: "T", terminal: false }
                    ]
                ]
            }
        ]);
    });

    it("simple 2: no need left factoring, return self", function () {
        const pset = createProdSetWithSplitter([
            "E -> int + int | "
        ]);
        assert.equal(pset.leftFactoredProdSet(), pset);
    });

    it("simple 3: 2 left factor for one non-terminal", function () {
        const pset = createProdSetWithSplitter([
            "E -> T + E | T | Q | Q * m | w",
            "T -> int | int * T | ( E )",
            "Q -> u"
        ]);
        const lfprodset = pset.leftFactoredProdSet();
        const Erhsarr = lfprodset.getProds(lfprodset.getSymId("E"));
        let new1: string = "";
        let new2: string = "";
        let new3: string = "";
        for (let i = 0; i < 3; ++i) {
            const rhs = lfprodset.getProdRef(Erhsarr[i]).rhsIds;
            if (rhs.length === 2) {
                const r1sym = lfprodset.getSymInStr(rhs[1]);
                if (rhs[0] === lfprodset.getSymId("T")) new1 = r1sym;
                else new2 = r1sym;
            }
        }
        const Trhsarr = lfprodset.getProds(lfprodset.getSymId("T"));
        new3 = lfprodset.getSymInStr(lfprodset.getProdRef(Trhsarr[lfprodset.getProdRef(Trhsarr[0]).rhsIds.length == 2 ? 0 : 1]).rhsIds[1]);
        validate(lfprodset, [
            {
                lhs: "E",
                rhsArr: [
                    [
                        { str: "T", terminal: false },
                        { str: new1, terminal: false }
                    ],
                    [
                        { str: "Q", terminal: false },
                        { str: new2, terminal: false }
                    ],
                    [
                        { str: "w", terminal: true }
                    ]
                ]
            }, {
                lhs: new1,
                rhsArr: [
                    [
                        { str: "+", terminal: true },
                        { str: "E", terminal: false }
                    ],
                    []
                ]
            }, {
                lhs: new2,
                rhsArr: [
                    [
                        { str: "*", terminal: true },
                        { str: "m", terminal: true }
                    ],
                    []
                ]
            }, {
                lhs: "T",
                rhsArr: [
                    [
                        { str: "int", terminal: true },
                        { str: new3, terminal: false }
                    ],
                    [
                        { str: "(", terminal: true },
                        { str: "E", terminal: false },
                        { str: ")", terminal: true }
                    ]
                ]
            }, {
                lhs: new3,
                rhsArr: [
                    [],
                    [
                        { str: "*", terminal: true },
                        { str: "T", terminal: false }
                    ]
                ]
            }, {
                lhs: "Q",
                rhsArr: [
                    [
                        { str: "u", terminal: true }
                    ]
                ]
            }
        ]);
    });


    it("simple 4: 2 layer of left factoring", function () {
        const pset = createProdSetWithSplitter([
            "E -> int + q | int + m | int +"
        ]);
        validate(pset.leftFactoredProdSet(), [
            {
                lhs: "E",
                rhsArr: [
                    [
                        { str: "int", terminal: true },
                        { str: "+", terminal: true },
                        { str: "D__0", terminal: false }
                    ]
                ]
            }, {
                lhs: "D__0",
                rhsArr: [
                    [
                        { str: "q", terminal: true }
                    ],
                    [
                        { str: "m", terminal: true }
                    ],
                    []
                ]
            }
        ]);
    });


    it("simple 5: 2 layer of left factoring-2", function () {
        const pset = createProdSetWithSplitter([
            "E -> int + q | int + m | int * w"
        ]);
        validate(pset.leftFactoredProdSet(), [
            {
                lhs: "E",
                rhsArr: [
                    [
                        { str: "int", terminal: true },
                        { str: "D__0", terminal: false }
                    ]
                ]
            }, {
                lhs: "D__0",
                rhsArr: [
                    [
                        { str: "+", terminal: true },
                        { str: "D__1", terminal: false }
                    ],
                    [
                        { str: "*", terminal: true },
                        { str: "w", terminal: true }
                    ]
                ]
            }, {
                lhs: "D__1",
                rhsArr: [
                    [
                        { str: "q", terminal: true }
                    ],
                    [
                        { str: "m", terminal: true }
                    ]
                ]
            }
        ]);
    });


    it("simple 6: 2 layer of left factoring-3", function () {
        const pset = createProdSetWithSplitter([
            "E -> int + q | int + m | int"
        ]);
        validate(pset.leftFactoredProdSet(), [
            {
                lhs: "E",
                rhsArr: [
                    [
                        { str: "int", terminal: true },
                        { str: "D__0", terminal: false }
                    ]
                ]
            }, {
                lhs: "D__0",
                rhsArr: [
                    [
                        { str: "+", terminal: true },
                        { str: "D__1", terminal: false }
                    ],
                    []
                ]
            }, {
                lhs: "D__1",
                rhsArr: [
                    [
                        { str: "q", terminal: true }
                    ],
                    [
                        { str: "m", terminal: true }
                    ]
                ]
            }
        ]);
    });
});

