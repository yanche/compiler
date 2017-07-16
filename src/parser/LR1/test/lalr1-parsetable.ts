
import * as assert from 'assert';
import * as utility from '../../../utility';
import {createLALR1Parser} from '../index';


describe('LALR(1) parse table', function () {
    it('invalid LALR(1), valid LR(1)', function () {
        let lalr1parser = createLALR1Parser([
            'S -> a E c | a F d | b F c | b E d',
            'E -> e',
            'F -> e'
        ]);
        //lalr1parser.print();
        assert.equal(false, lalr1parser.isValid());
    });
    
    it('valid LALR(1), valid SLR(1)', function () {
        let lalr1parser = createLALR1Parser([
            'E -> T + E | T',
            'T -> int | int * T | ( E )'
        ]);
        //lalr1parser.print();
        assert.equal(true, lalr1parser.isValid());
    });
    
    it('valid LALR(1), invalid SLR(1)', function () {
        let lalr1parser = createLALR1Parser([
            'S -> A a | b A c | d c | b d a',
            'A -> d'
        ]);
        // lalr1parser.print();
        // console.log(lalr1parser.isValid());
        assert.equal(true, lalr1parser.isValid());
    });
});


