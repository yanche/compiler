
import * as assert from 'assert';
import * as utility from 'utility';
import {createLALR1Parser} from '../index';
import * as tutil from './util';
import * as c from 'compile';


describe('LALR(1) parse', function () {
    it('simple 1', function () {
        let lalr1parser = createLALR1Parser([
            'E -> T + E | T',
            'T -> int | int * T | ( E )'
        ]);
        let parseret = lalr1parser.parse([
            new c.Token('1', lalr1parser.prodset.getSymNum('int'), c.noArea),
            new c.Token('+', lalr1parser.prodset.getSymNum('+'), c.noArea),
            new c.Token('2', lalr1parser.prodset.getSymNum('int'), c.noArea),
            new c.Token('*', lalr1parser.prodset.getSymNum('*'), c.noArea),
            new c.Token('3', lalr1parser.prodset.getSymNum('int'), c.noArea)
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
