
import * as assert from "assert";
import { arrayEquivalent } from "../../testutil";
import { createProdSetWithSplitter, ProdSet } from "../index";

function validate(prodset: ProdSet, expected: { symbols: string[]; firsts: string[]; nullable: boolean; }[]) {
    for (const e of expected) {
        const result = prodset.firstSetOfSymbols(e.symbols.map(s => prodset.getSymId(s)));
        assert.strictEqual(result.nullable, e.nullable);
        assert.strictEqual(arrayEquivalent([...result.firstSet].map(s => prodset.getSymInStr(s)), e.firsts), true);
    }
};

describe("firstSetOfSymbols", function () {
    it("simple 1", function () {
        const pset = createProdSetWithSplitter([
            "T -> E | int | m",
            "E -> "
        ]);
        validate(pset, [
            { symbols: ["E"], firsts: [], nullable: true },
            { symbols: ["T"], firsts: ["int", "m"], nullable: true },
            { symbols: ["int"], firsts: ["int"], nullable: false },
            { symbols: ["T", "int"], firsts: ["int", "m"], nullable: false },
            { symbols: ["E", "T"], firsts: ["int", "m"], nullable: true },
            { symbols: ["E", "m"], firsts: ["m"], nullable: false },
        ]);
    });
});