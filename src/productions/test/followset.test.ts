
 import { assert } from "chai";
import * as utility from "../../utility";
import {createProdSetWithSplitter, ProdSet} from "../index";

function validate(prodset: ProdSet, expected: Array<{ symbol: string, follow: Array<string> }>) {
    let startsymnum = prodset.getStartNonTerminal();
    let finsymnum = prodset.getSymNum("$");
    let followsets = prodset.followSet();
    let testedset = followsets.filter((x, idx) => idx !== startsymnum && idx !== finsymnum);
    assert.equal(true, utility.arrayEquivalent(testedset, expected, function (f, e) {
        return f === followsets[prodset.getSymNum(e.symbol)] && utility.arrayEquivalent([...f], e.follow.map(x => prodset.getSymNum(x)));
    }));
};

describe("follow sets", function () {
    it("simple 1", function () {
        let pset = createProdSetWithSplitter([
            "E -> T + E | T",
            "T -> int | int * T | ( E )"
        ]);
        validate(pset, [
            { symbol: "E", follow: ["$", ")"] },
            { symbol: "T", follow: ["$", ")", "+"] },
            { symbol: "(", follow: ["int", "("] },
            { symbol: ")", follow: ["$", ")", "+"] },
            { symbol: "+", follow: ["int", "("] },
            { symbol: "*", follow: ["int", "("] },
            { symbol: "int", follow: ["$", ")", "+", "*"] }
        ]);
    });

    it("simple 2", function () {
        let pset = createProdSetWithSplitter([
            "E -> "
        ]);
        validate(pset, [
            { symbol: "E", follow: ["$"] }
        ]);
    });

    it("simple 3", function () {
        let pset = createProdSetWithSplitter([
            "T -> E | int",
            "E -> "
        ]);
        validate(pset, [
            { symbol: "E", follow: ["$"] },
            { symbol: "T", follow: ["$"] },
            { symbol: "int", follow: ["$"] }
        ]);
    });

    it("simple 4", function () {
        let pset = createProdSetWithSplitter([
            "S -> A a | b A c | d c | b d a",
            "A -> d"
        ]);
        validate(pset, [
            { symbol: "a", follow: ["$"] },
            { symbol: "b", follow: ["d"] },
            { symbol: "c", follow: ["$"] },
            { symbol: "d", follow: ["a", "c"] },
            { symbol: "S", follow: ["$"] },
            { symbol: "A", follow: ["a", "c"] }
        ]);
    });

    it("simple 5", function () {
        let pset = createProdSetWithSplitter([
            "TT -> EE | inXt",
            "EE -> "
        ]);
        validate(pset, [
            { symbol: "EE", follow: ["$"] },
            { symbol: "TT", follow: ["$"] },
            { symbol: "inXt", follow: ["$"] }
        ]);
    });
});