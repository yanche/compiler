
import * as assert from 'assert';
import * as utility from '../../utility';
import {createProdSet} from '../index';
import * as prod from '../production';

function validate(pset: prod.ProdSet, expected: Array<{ lhs: string, rhsArr: Array<Array<{ str: string, terminal: boolean }>> }>) {
    let allLHS = pset.getNonTerminalsInStr();
    assert.equal(true, utility.arrayEquivalent([...allLHS], expected.map(function (e) { return e.lhs; })));
    for (let i = 0; i < expected.length; ++i) {
        let item = expected[i];
        assert.equal(true, utility.arrayEquivalent(item.rhsArr, pset.getProds(pset.getSymNum(item.lhs)).map(p => pset.getProdRef(p).rnums), function (test, real) {
            //test and real are both array
            if (test.length !== real.length) return false;
            for (let q = 0; q < test.length; ++q) {
                let titem = test[q], symnum = real[q];
                if (pset.getSymNum(titem.str) !== symnum || titem.terminal !== pset.isSymNumTerminal(symnum)) return false;
            }
            return true;
        }));
    }
};


describe('production set left factoring', function () {
    it('simple 1', function () {
        let pset = createProdSet([
            'E -> T + E | T',
            'T -> int | int * T | ( E )'
        ]);
        let lfprodset = pset.leftFactoredProdSet();
        let new1 = lfprodset.getSymInStr(lfprodset.getProdRef(lfprodset.getProds(lfprodset.getSymNum('E'))[0]).rnums[1]);
        let trhsarr = lfprodset.getProds(lfprodset.getSymNum('T'));
        let new2 = lfprodset.getSymInStr(lfprodset.getProdRef(trhsarr[lfprodset.getProdRef(trhsarr[0]).rnums.length == 2 ? 0 : 1]).rnums[1]);
        validate(lfprodset, [
            {
                lhs: 'E',
                rhsArr: [
                    [
                        { str: 'T', terminal: false },
                        { str: new1, terminal: false }
                    ]
                ]
            }, {
                lhs: new1,
                rhsArr: [
                    [
                        { str: '+', terminal: true },
                        { str: 'E', terminal: false }
                    ],
                    []
                ]
            }, {
                lhs: 'T',
                rhsArr: [
                    [
                        { str: 'int', terminal: true },
                        { str: new2, terminal: false }
                    ],
                    [
                        { str: '(', terminal: true },
                        { str: 'E', terminal: false },
                        { str: ')', terminal: true }
                    ]
                ]
            }, {
                lhs: new2,
                rhsArr: [
                    [],
                    [
                        { str: '*', terminal: true },
                        { str: 'T', terminal: false }
                    ]
                ]
            }
        ]);
    });

    it('simple 2: no need left factoring, return self', function () {
        let pset = createProdSet([
            'E -> int + int | '
        ]);
        assert.equal(pset.leftFactoredProdSet(), pset);
    });

    it('simple 3: 2 left factor for one non-terminal', function () {
        let pset = createProdSet([
            'E -> T + E | T | Q | Q * m | w',
            'T -> int | int * T | ( E )',
            'Q -> u'
        ]);
        let lfprodset = pset.leftFactoredProdSet();
        let Erhsarr = lfprodset.getProds(lfprodset.getSymNum('E'));
        let new1: string, new2: string, new3: string;
        for (let i = 0; i < 3; ++i) {
            let rhs = lfprodset.getProdRef(Erhsarr[i]).rnums;
            if (rhs.length === 2) {
                let r1sym = lfprodset.getSymInStr(rhs[1]);
                if (rhs[0] === lfprodset.getSymNum('T')) new1 = r1sym;
                else new2 = r1sym;
            }
        }
        let Trhsarr = lfprodset.getProds(lfprodset.getSymNum('T'));
        new3 = lfprodset.getSymInStr(lfprodset.getProdRef(Trhsarr[lfprodset.getProdRef(Trhsarr[0]).rnums.length == 2 ? 0 : 1]).rnums[1]);
        validate(lfprodset, [
            {
                lhs: 'E',
                rhsArr: [
                    [
                        { str: 'T', terminal: false },
                        { str: new1, terminal: false }
                    ],
                    [
                        { str: 'Q', terminal: false },
                        { str: new2, terminal: false }
                    ],
                    [
                        { str: 'w', terminal: true }
                    ]
                ]
            }, {
                lhs: new1,
                rhsArr: [
                    [
                        { str: '+', terminal: true },
                        { str: 'E', terminal: false }
                    ],
                    []
                ]
            }, {
                lhs: new2,
                rhsArr: [
                    [
                        { str: '*', terminal: true },
                        { str: 'm', terminal: true }
                    ],
                    []
                ]
            }, {
                lhs: 'T',
                rhsArr: [
                    [
                        { str: 'int', terminal: true },
                        { str: new3, terminal: false }
                    ],
                    [
                        { str: '(', terminal: true },
                        { str: 'E', terminal: false },
                        { str: ')', terminal: true }
                    ]
                ]
            }, {
                lhs: new3,
                rhsArr: [
                    [],
                    [
                        { str: '*', terminal: true },
                        { str: 'T', terminal: false }
                    ]
                ]
            }, {
                lhs: 'Q',
                rhsArr: [
                    [
                        { str: 'u', terminal: true }
                    ]
                ]
            }
        ]);
    });


    it('simple 4: 2 layer of left factoring', function () {
        let pset = createProdSet([
            'E -> int + q | int + m | int +'
        ]);
        validate(pset.leftFactoredProdSet(), [
            {
                lhs: 'E',
                rhsArr: [
                    [
                        { str: 'int', terminal: true },
                        { str: '+', terminal: true },
                        { str: 'D__0', terminal: false }
                    ]
                ]
            }, {
                lhs: 'D__0',
                rhsArr: [
                    [
                        { str: 'q', terminal: true }
                    ],
                    [
                        { str: 'm', terminal: true }
                    ],
                    []
                ]
            }
        ]);
    });


    it('simple 5: 2 layer of left factoring-2', function () {
        let pset = createProdSet([
            'E -> int + q | int + m | int * w'
        ]);
        validate(pset.leftFactoredProdSet(), [
            {
                lhs: 'E',
                rhsArr: [
                    [
                        { str: 'int', terminal: true },
                        { str: 'D__0', terminal: false }
                    ]
                ]
            }, {
                lhs: 'D__0',
                rhsArr: [
                    [
                        { str: '+', terminal: true },
                        { str: 'D__1', terminal: false }
                    ],
                    [
                        { str: '*', terminal: true },
                        { str: 'w', terminal: true }
                    ]
                ]
            }, {
                lhs: 'D__1',
                rhsArr: [
                    [
                        { str: 'q', terminal: true }
                    ],
                    [
                        { str: 'm', terminal: true }
                    ]
                ]
            }
        ]);
    });


    it('simple 6: 2 layer of left factoring-3', function () {
        let pset = createProdSet([
            'E -> int + q | int + m | int'
        ]);
        validate(pset.leftFactoredProdSet(), [
            {
                lhs: 'E',
                rhsArr: [
                    [
                        { str: 'int', terminal: true },
                        { str: 'D__0', terminal: false }
                    ]
                ]
            }, {
                lhs: 'D__0',
                rhsArr: [
                    [
                        { str: '+', terminal: true },
                        { str: 'D__1', terminal: false }
                    ],
                    []
                ]
            }, {
                lhs: 'D__1',
                rhsArr: [
                    [
                        { str: 'q', terminal: true }
                    ],
                    [
                        { str: 'm', terminal: true }
                    ]
                ]
            }
        ]);
    });
});

