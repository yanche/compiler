
import { assert } from "chai";
import * as utility from "../../utility";
import { createProdSetWithSplitter } from "../index";
import { ProdSet } from "../production";

function validate(pset: ProdSet, symarr: string[]) {
    const startsymnum = pset.startNonTerminalId;
    assert.equal(true, utility.arrayEquivalent([...pset.nullableNonTerminals()].filter(n => n !== startsymnum).map(n => pset.getSymInStr(n)), symarr));
}

describe("non terminal able to produce epsilon", function () {
    it("simple 1", function () {
        const pset = createProdSetWithSplitter([
            "E -> T + E | T",
            "T -> int | int * T | ( E )"
        ]);
        validate(pset, []);
    });

    it("simple 2", function () {
        const pset = createProdSetWithSplitter([
            "E -> "
        ]);
        validate(pset, ["E"]);
    });

    it("simple 3", function () {
        const pset = createProdSetWithSplitter([
            "T -> E | int",
            "E -> "
        ]);
        validate(pset, ["E", "T"]);
    });

    it("simple 4", function () {
        const pset = createProdSetWithSplitter([
            "A -> T",
            "T -> E X | int",
            "X -> q | ",
            "E -> | m"
        ]);
        validate(pset, ["T", "E", "A", "X"]);
    });

    it("simple 5", function () {
        const pset = createProdSetWithSplitter([
            "TT -> EE | inXt",
            "EE -> "
        ]);
        validate(pset, ["TT", "EE"]);
    });
});
