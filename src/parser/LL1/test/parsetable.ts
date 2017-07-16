
import * as assert from 'assert';
import {createLL1Parser} from '../index';
import LL1Parser from '../parser';

function validate(parser: LL1Parser, expected: Array<{ lstr: string, cols: Array<{ termi: string, prod: Array<string> }> }>) {
    for (let item of expected) {
        let prow = parser.getParseRow(parser.prodset.getSymNum(item.lstr));
        assert.equal(prow.size, item.cols.length);
        for (let item2 of item.cols) {
            let prods = prow.get(parser.prodset.getSymNum(item2.termi));
            assert.equal(prods.length, 1);
            let prod = parser.getProdRef(prods[0]).rnums;
            assert.equal(prod.length, item2.prod.length);
            for (let i = 0; i < prod.length; ++i) {
                assert.equal(prod[i], parser.prodset.getSymNum(item2.prod[i]));
            }
        }
    }
};

describe('LL(1) parse table', function () {
    it('simple 1', function () {
        let ll1parser = createLL1Parser([
            'E -> T X',
            'X -> + E | ',
            'T -> int Y | ( E )',
            'Y -> | * T'
        ]);
        validate(ll1parser, [{
            lstr: 'E',
            cols: [
                {
                    termi: 'int',
                    prod: ['T', 'X']
                },
                {
                    termi: '(',
                    prod: ['T', 'X']
                }
            ]
        }]);
    });
});
