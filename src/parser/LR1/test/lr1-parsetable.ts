
import * as assert from 'assert';
import * as utility from '../../../utility';
import {createLR1Parser} from '../index';


describe('LR(1) parse table', function () {
    it('invalid LALR(1), valid LR(1)', function () {
        let lr1parser = createLR1Parser([
            'S -> a E c | a F d | b F c | b E d',
            'E -> e',
            'F -> e'
        ]);
        //lr1parser.print();
        assert.equal(true, lr1parser.isValid());
    });
    
    it('valid LALR(1), valid SLR(1)', function () {
        let lr1parser = createLR1Parser([
            'E -> T + E | T',
            'T -> int | int * T | ( E )'
        ]);
        //lr1parser.print();
        assert.equal(true, lr1parser.isValid());
    });
    
    it('valid LALR(1), invalid SLR(1)', function () {
        let lr1parser = createLR1Parser([
            'S -> A a | b A c | d c | b d a',
            'A -> d'
        ]);
        // lr1parser.print();
        // console.log(lr1parser.isValid());
        assert.equal(true, lr1parser.isValid());
    });
});


