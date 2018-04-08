
import { assert } from "chai";
import * as utility from "../../utility";
import { createProdSetWithSplitter, ProdSet } from "../index";

function validate(prodset: ProdSet, expected: Array<{ symbol: string, follow: Array<string> }>) {
    const startsymnum = prodset.startNonTerminalId;
    const finsymnum = prodset.getSymId("$");
    const followsets = prodset.followSet();
    const testedset = followsets.filter((x, idx) => idx !== startsymnum && idx !== finsymnum);
    assert.equal(true, utility.arrayEquivalent(testedset, expected, function (f, e) {
        return f === followsets[prodset.getSymId(e.symbol)] && utility.arrayEquivalent([...f], e.follow.map(x => prodset.getSymId(x)));
    }));
};

describe("follow sets", function () {
    it("simple 1", function () {
        const pset = createProdSetWithSplitter([
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
        const pset = createProdSetWithSplitter([
            "E -> "
        ]);
        validate(pset, [
            { symbol: "E", follow: ["$"] }
        ]);
    });

    it("simple 3", function () {
        const pset = createProdSetWithSplitter([
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
        const pset = createProdSetWithSplitter([
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
        const pset = createProdSetWithSplitter([
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