
import { assert } from "chai";
import * as utility from "../../utility";
import { createProdSetWithSplitter, ProdSet } from "../index";

function validate(prodset: ProdSet, expected: Array<{ symbol: string, firsts: Array<string> }>) {
    const startsymnum = prodset.startNonTerminalId;
    const finsymnum = prodset.getSymId("$");
    const firstSet = prodset.firstSet();
    const testedset = firstSet.filter((x, idx) => idx !== startsymnum && idx !== finsymnum);
    assert.equal(true, utility.arrayEquivalent(testedset, expected, function (f, e) {
        return f === firstSet[prodset.getSymId(e.symbol)] && utility.arrayEquivalent([...f].map(n => prodset.getSymInStr(n)), e.firsts);
    }));
};

describe("first sets", function () {
    it("simple 1", function () {
        const pset = createProdSetWithSplitter([
            "E -> T + E | T",
            "T -> int | int * T | ( E )"
        ]);
        validate(pset, [
            { symbol: "E", firsts: ["int", "("] },
            { symbol: "T", firsts: ["int", "("] },
            { symbol: "(", firsts: ["("] },
            { symbol: ")", firsts: [")"] },
            { symbol: "+", firsts: ["+"] },
            { symbol: "*", firsts: ["*"] },
            { symbol: "int", firsts: ["int"] }
        ]);
    });

    it("simple 2", function () {
        const pset = createProdSetWithSplitter([
            "E -> "
        ]);
        validate(pset, [
            { symbol: "E", firsts: [] }
        ]);
    });

    it("simple 3", function () {
        const pset = createProdSetWithSplitter([
            "T -> E | int",
            "E -> "
        ]);
        validate(pset, [
            { symbol: "E", firsts: [] },
            { symbol: "T", firsts: ["int"] },
            { symbol: "int", firsts: ["int"] }
        ]);
    });

    it("simple 4", function () {
        const pset = createProdSetWithSplitter([
            "A -> T",
            "T -> E X | int",
            "X -> q | ",
            "E -> | m"
        ]);
        validate(pset, [
            { symbol: "E", firsts: ["m"] },
            { symbol: "T", firsts: ["m", "q", "int"] },
            { symbol: "X", firsts: ["q"] },
            { symbol: "A", firsts: ["m", "q", "int"] },
            { symbol: "int", firsts: ["int"] },
            { symbol: "q", firsts: ["q"] },
            { symbol: "m", firsts: ["m"] }
        ]);
    });

    it("simple 5", function () {
        const pset = createProdSetWithSplitter([
            "TT -> EE | inXt",
            "EE -> "
        ]);
        validate(pset, [
            { symbol: "EE", firsts: [] },
            { symbol: "TT", firsts: ["inXt"] },
            { symbol: "inXt", firsts: ["inXt"] }
        ]);
    });
});