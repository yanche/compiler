
import * as assert from 'assert';
import * as utility from '../../../utility';
import {createSLR1Parser} from '../index';
import * as tutil from './util';
import * as c from '../../../compile';


describe('SLR(1) parse', function () {
    it('simple 1', function () {
        let slr1parser = createSLR1Parser([
            'E -> T + E | T',
            'T -> int | int * T | ( E )'
        ]);
        let parseret = slr1parser.parse([
            new c.Token('1', slr1parser.prodset.getSymNum('int'), c.noArea),
            new c.Token('+', slr1parser.prodset.getSymNum('+'), c.noArea),
            new c.Token('2', slr1parser.prodset.getSymNum('int'), c.noArea),
            new c.Token('*', slr1parser.prodset.getSymNum('*'), c.noArea),
            new c.Token('3', slr1parser.prodset.getSymNum('int'), c.noArea)
        ]);
        assert.equal(true, parseret.accept);
        tutil.validate(parseret.root, {
            symstr: 'E',
            mid: true,
            children: [
                {
                    symstr: 'T',
                    mid: true,
                    children: [
                        {
                            symstr: 'int',
                            mid: false,
                            rawstr: '1'
                        }
                    ]
                },
                { symstr: '+', mid: false, rawstr: '+' },
                {
                    symstr: 'E',
                    mid: true,
                    children: [
                        {
                            symstr: 'T',
                            mid: true,
                            children: [
                                { symstr: 'int', mid: false, rawstr: '2' },
                                { symstr: '*', mid: false, rawstr: '*' },
                                {
                                    symstr: 'T', mid: true, children: [
                                        { symstr: 'int', mid: false, rawstr: '3' }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        });
    });
});
