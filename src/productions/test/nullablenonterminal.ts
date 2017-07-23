
import * as assert from "assert";
import * as utility from "../../utility";
import {createProdSet} from "../index";
import {ProdSet} from "../production";

describe("non terminal able to produce epsilon", function () {
    it("simple 1", function () {
        var pset = createProdSet([
            "E -> T + E | T",
            "T -> int | int * T | ( E )"
        ]);
        assert.equal(0, pset.nullableNonTerminals().size);
    });

    it("simple 2", function () {
        var pset = createProdSet([
            "E -> "
        ]);
        assert.equal(true, utility.arrayEquivalent([...pset.nullableNonTerminals()].map(n => pset.getSymInStr(n)), ["E"]));
    });

    it("simple 3", function () {
        var pset = createProdSet([
            "T -> E | int",
            "E -> "
        ]);
        assert.equal(true, utility.arrayEquivalent([...pset.nullableNonTerminals()].map(n => pset.getSymInStr(n)), ["T", "E"]));
    });

    it("simple 4", function () {
        var pset = createProdSet([
            "A -> T",
            "T -> E X | int",
            "X -> q | ",
            "E -> | m"
        ]);
        assert.equal(true, utility.arrayEquivalent([...pset.nullableNonTerminals()].map(n => pset.getSymInStr(n)), ["T", "E", "A", "X"]));
    });

    it("simple 5", function () {
        var pset = createProdSet([
            "TT -> EE | inXt",
            "EE -> "
        ]);
        assert.equal(true, utility.arrayEquivalent([...pset.nullableNonTerminals()].map(n => pset.getSymInStr(n)), ["TT", "EE"]));
    });
});
