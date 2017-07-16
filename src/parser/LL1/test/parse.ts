
import * as assert from 'assert';
import {createLL1Parser} from '../index';
import * as c from 'compile';


describe('LL(1) parse', function () {
    it('simple 1', function () {
        let ll1parser = createLL1Parser([
            'E -> T X',
            'X -> + E | ',
            'T -> int Y | ( E )',
            'Y -> | * T'
        ]);
        let parseret = ll1parser.parse([
            new c.Token('1', ll1parser.prodset.getSymNum('int'), c.noArea),
            new c.Token('+', ll1parser.prodset.getSymNum('+'), c.noArea),
            new c.Token('2', ll1parser.prodset.getSymNum('int'), c.noArea),
            new c.Token('*', ll1parser.prodset.getSymNum('*'), c.noArea),
            new c.Token('3', ll1parser.prodset.getSymNum('int'), c.noArea)
        ]);
        assert.equal(true, parseret.accept);
    });
});
