
import * as assert from 'assert';
import * as utility from 'utility';
import {createProdSet} from '../index';
import {ProdSet} from '../production';

describe('non terminal able to produce epsilon', function () {
    it('simple 1', function () {
        var pset = createProdSet([
            'E -> T + E | T',
            'T -> int | int * T | ( E )'
        ]);
        assert.equal(0, pset.nullableNonTerminalsInStr().length);
    });

    it('simple 2', function () {
        var pset = createProdSet([
            'E -> '
        ]);
        assert.equal(true, utility.arrayEquivalent(pset.nullableNonTerminalsInStr(), ['E']));
    });

    it('simple 3', function () {
        var pset = createProdSet([
            'T -> E | int',
            'E -> '
        ]);
        assert.equal(true, utility.arrayEquivalent(pset.nullableNonTerminalsInStr(), ['T', 'E']));
    });

    it('simple 4', function () {
        var pset = createProdSet([
            'A -> T',
            'T -> E X | int',
            'X -> q | ',
            'E -> | m'
        ]);
        assert.equal(true, utility.arrayEquivalent(pset.nullableNonTerminalsInStr(), ['T', 'E', 'A', 'X']));
    });

    it('simple 5', function () {
        var pset = createProdSet([
            'TT -> EE | inXt',
            'EE -> '
        ]);
        assert.equal(true, utility.arrayEquivalent(pset.nullableNonTerminalsInStr(), ['TT', 'EE']));
    });
});
