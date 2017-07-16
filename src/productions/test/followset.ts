
import * as assert from 'assert';
import * as utility from '../../utility';
import {createProdSet, ProdSet} from '../index';

function validate(prodset: ProdSet, expected: Array<{ symbol: string, follow: Array<string> }>) {
    let followsets = prodset.followSet();
    assert.equal(true, utility.arrayEquivalent(followsets.slice(1), expected, function (f, e) {
        return f === followsets[prodset.getSymNum(e.symbol)] && utility.arrayEquivalent([...f], e.follow.map(x => prodset.getSymNum(x)));
    }));
};

describe('follow sets', function () {
    it('simple 1', function () {
        let pset = createProdSet([
            'E -> T + E | T',
            'T -> int | int * T | ( E )'
        ]);
        validate(pset, [
            { symbol: 'E', follow: ['$', ')'] },
            { symbol: 'T', follow: ['$', ')', '+'] },
            { symbol: '(', follow: ['int', '('] },
            { symbol: ')', follow: ['$', ')', '+'] },
            { symbol: '+', follow: ['int', '('] },
            { symbol: '*', follow: ['int', '('] },
            { symbol: 'int', follow: ['$', ')', '+', '*'] }
        ]);
    });

    it('simple 2', function () {
        let pset = createProdSet([
            'E -> '
        ]);
        validate(pset, [
            { symbol: 'E', follow: ['$'] }
        ]);
    });

    it('simple 3', function () {
        let pset = createProdSet([
            'T -> E | int',
            'E -> '
        ]);
        validate(pset, [
            { symbol: 'E', follow: ['$'] },
            { symbol: 'T', follow: ['$'] },
            { symbol: 'int', follow: ['$'] }
        ]);
    });

    it('simple 4', function () {
        let pset = createProdSet([
            'S -> A a | b A c | d c | b d a',
            'A -> d'
        ]);
        pset.printFollowSet();
        // validate(pset, [
        //     { symbol: 'E', follow: ['q', '$'] },
        //     { symbol: 'T', follow: ['$'] },
        //     { symbol: 'X', follow: ['$'] },
        //     { symbol: 'A', follow: ['$'] },
        //     { symbol: 'int', follow: ['$'] },
        //     { symbol: 'q', follow: ['$'] },
        //     { symbol: 'm', follow: ['q', '$'] }
        // ]);
    });

    // it('simple 5', function () {
    //     let pset = createProdSet([
    //         'TT -> EE | inXt',
    //         'EE -> '
    //     ]);
    //     validate(pset, [
    //         { symbol: 'EE', follow: ['$'] },
    //         { symbol: 'TT', follow: ['$'] },
    //         { symbol: 'inXt', follow: ['$'] }
    //     ]);
    // });
});