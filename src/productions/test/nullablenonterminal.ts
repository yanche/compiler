
import * as assert from "assert";
import * as utility from "../../utility";
import { createProdSet } from "../index";
import { ProdSet } from "../production";

function validate(pset: ProdSet, symarr: string[]) {
    let startsymnum = pset.getStartNonTerminal();
    assert.equal(true, utility.arrayEquivalent([...pset.nullableNonTerminals()].filter(n => n !== startsymnum).map(n => pset.getSymInStr(n)), symarr));
}

describe("non terminal able to produce epsilon", function () {
    it("simple 1", function () {
        let pset = createProdSet([
            "E -> T + E | T",
            "T -> int | int * T | ( E )"
        ]);
        validate(pset, []);
    });

    it("simple 2", function () {
        let pset = createProdSet([
            "E -> "
        ]);
        validate(pset, ["E"]);
    });

    it("simple 3", function () {
        let pset = createProdSet([
            "T -> E | int",
            "E -> "
        ]);
        validate(pset, ["E", "T"]);
    });

    it("simple 4", function () {
        let pset = createProdSet([
            "A -> T",
            "T -> E X | int",
            "X -> q | ",
            "E -> | m"
        ]);
        validate(pset, ["T", "E", "A", "X"]);
    });

    it("simple 5", function () {
        let pset = createProdSet([
            "TT -> EE | inXt",
            "EE -> "
        ]);
        validate(pset, ["TT", "EE"]);
    });
});
