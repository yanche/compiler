
import * as assert from 'assert';
import * as utility from 'utility';
import {createProdSet} from '../index';
import {ProdSet} from '../production';


function validate(pset: ProdSet, expected: Array<{ lhs: string, rhsArr: Array<Array<{ str: string, terminal: boolean }>> }>) {
    let allLHS = pset.getNonTerminalsInStr();
    assert.equal(true, utility.arrayEquivalent([...allLHS], expected.map(function (e) { return e.lhs; })));
    for (let i = 0; i < expected.length; ++i) {
        let item = expected[i];
        assert.equal(true, utility.arrayEquivalent(item.rhsArr, pset.getProds(pset.getSymNum(item.lhs)).map(p => pset.getProdRef(p).rnums), function (test, real): boolean {
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

describe('parse string into structured production set', function () {
    it('simple 1', function () {
        let pset = createProdSet([
            'E -> T + E | T',
            'T -> int | int * T | ( E )'
        ]);
        assert.equal('E', pset.getStartNonTerminalInStr());
        validate(pset, [
            {
                lhs: 'E',
                rhsArr: [
                    [
                        { str: 'T', terminal: false },
                        { str: '+', terminal: true },
                        { str: 'E', terminal: false }
                    ],
                    [
                        { str: 'T', terminal: false }
                    ]
                ]
            }, {
                lhs: 'T',
                rhsArr: [
                    [
                        { str: 'int', terminal: true },
                        { str: '*', terminal: true },
                        { str: 'T', terminal: false }
                    ],
                    [
                        { str: '(', terminal: true },
                        { str: 'E', terminal: false },
                        { str: ')', terminal: true }
                    ],
                    [
                        { str: 'int', terminal: true }
                    ]
                ]
            }
        ]);
    });

    it('simple 2', function () {
        let pset = createProdSet([
            'E -> int + int | '
        ]);
        assert.equal('E', pset.getStartNonTerminalInStr());
        validate(pset, [
            {
                lhs: 'E',
                rhsArr: [
                    [
                        { str: 'int', terminal: true },
                        { str: '+', terminal: true },
                        { str: 'int', terminal: true }
                    ],
                    []
                ]
            }
        ]);
    });

    it('not all non-terminal appears at LHS', function () {
        assert.throws(function () {
            return createProdSet([
                'E -> T | int'
            ]);
        }, Error);
    });
});
