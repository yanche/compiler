
import * as assert from "assert";
import * as utility from "../../utility";
import { createProdSet, ProdSet } from "../index";

function validate(prodset: ProdSet, expected: Array<{ symbol: string, firsts: Array<string> }>) {
    let startsymnum = prodset.getStartNonTerminal();
    let finsymnum = prodset.getSymNum("$");
    let firstSet = prodset.firstSet();
    let testedset = firstSet.filter((x, idx) => idx !== startsymnum && idx !== finsymnum);
    assert.equal(true, utility.arrayEquivalent(testedset, expected, function (f, e) {
        return f === firstSet[prodset.getSymNum(e.symbol)] && utility.arrayEquivalent([...f].map(n => prodset.getSymInStr(n)), e.firsts);
    }));
};

describe("first sets", function () {
    it("simple 1", function () {
        let pset = createProdSet([
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
        let pset = createProdSet([
            "E -> "
        ]);
        validate(pset, [
            { symbol: "E", firsts: [] }
        ]);
    });

    it("simple 3", function () {
        let pset = createProdSet([
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
        let pset = createProdSet([
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
        let pset = createProdSet([
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