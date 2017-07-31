
import * as assert from "assert";
import { createLL1Parser } from "../index";
import { Token, noArea } from "../../../compile";
import { createProdSet } from "../../../productions";


describe("LL(1) parse", function () {
    it("simple 1", function () {
        let prodset = createProdSet([
            "E -> T X",
            "X -> + E | ",
            "T -> int Y | ( E )",
            "Y -> | * T"
        ]);
        let ll1parser = createLL1Parser(prodset);
        let parseret = ll1parser.parse([
            new Token("1", prodset.getSymNum("int"), noArea),
            new Token("+", prodset.getSymNum("+"), noArea),
            new Token("2", prodset.getSymNum("int"), noArea),
            new Token("*", prodset.getSymNum("*"), noArea),
            new Token("3", prodset.getSymNum("int"), noArea),
            new Token("$", prodset.getSymNum("$"), noArea)
        ]);
        assert.equal(true, parseret.accept);
    });
});
