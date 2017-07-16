
import * as assert from 'assert';
import * as utility from 'utility';
import {createSLR1Parser} from '../index';


describe('SLR(1) parse table', function () {
    it('invalid LALR(1), valid LR(1)', function () {
        let slr1parser = createSLR1Parser([
            'S -> a E c | a F d | b F c | b E d',
            'E -> e',
            'F -> e'
        ]);
        //slr1parser.print();
        assert.equal(false, slr1parser.isValid());
    });
    
    it('valid LALR(1), valid SLR(1)', function () {
        let slr1parser = createSLR1Parser([
            'E -> T + E | T',
            'T -> int | int * T | ( E )'
        ]);
        //slr1parser.print();
        assert.equal(true, slr1parser.isValid());
    });
    
    it('valid LALR(1), invalid SLR(1)', function () {
        let slr1parser = createSLR1Parser([
            'S -> A a | b A c | d c | b d a',
            'A -> d'
        ]);
        // slr1parser.print();
        // console.log(slr1parser.isValid());
        assert.equal(false, slr1parser.isValid());
    });
});
